import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import { Button, Card, Row, Col, Segmented, Input, Tour } from 'antd';

import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';

import { onlyNumberFormat, hasNumber, capitalizeAfterSentence, getClinicName } from "../../utils/utils";

import CashManagerContext from '../../context/CashManagerContext';
import { searchDiagnosis } from "../../redux/diagnosisSlice";
import { updateDragDrop } from "../../redux/doctorsSlice";

import TabSearchHeader from "./TabSearchHeader";
import LoopingVideo from "../common/LoopingVideo";

import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { WarningColor, WarningRank } from "../DifferentialDiagnosisDrawer";
import { useLocation } from "react-router-dom";
import { ASSETS } from "../../assets";
const {
  dragChips_2: dragChipsWebm,
  dragChips: dragChipsMp4,
  tagNew,
  apexai: apexAI,
} = ASSETS.images;

function TabDiagnosisSearch({ passIndex, onClose, ddxOptionsList }) {

    const {
        parentOptionsList,
        childOptionsList,
    } = useSelector((state) => state.diagnosis);
    const { dragDrop } = useSelector((state) => state.doctors);
    const dispatch = useDispatch();
    const { profile } = useSelector((state) => state.doctors);
    const { state } = useLocation();
    const { patient_data } = state;

    const { diagnosisData, setDiagnosisData } = useContext(CashManagerContext);

    const [searchChildQuery, setSearchChildQuery] = useState("");
    const [childSearchOptions, setChildSearchOptions] = useState([]);

    const [selectedIndex, setSelectedIndex] = useState(passIndex);
    const SINCE_OPTIONS = [
        { value: "Hour", label: "H" },
        { value: "Day", label: "D" },
        { value: "Week", label: "W" },
        { value: "Month", label: "M" },
        { value: "Year", label: "Y" },
    ];
    const [sinceValue, setSinceValue] = useState(1);
    const [inputSince, setInputSince] = useState('');
    const [sinceOptions, setSinceOptions] = useState([]);

    //Parent AutoComplete
    useEffect(() => {
        if (searchChildQuery) {
            const timeOutId = setTimeout(() => {
                dispatch(
                    searchDiagnosis({ searchQuery: searchChildQuery, type: "child" })
                );
            }, 500);
            return () => {
                clearTimeout(timeOutId);
            };
        }
    }, [searchChildQuery]);

    useEffect(() => {
        const data = [];
        childOptionsList.map((e) => {
            return data.push({
                key: JSON.stringify({ ...e, unique_id: uuidv4() }),
                value: `${e.tds_name} ${e?.icd_code ? `(${e?.icd_code})` : ''}`
            });
        });
        if (searchChildQuery.length > 0) {
            searchChildQuery && childOptionsList.findIndex(e => e.tds_name?.toLowerCase()?.trim() == searchChildQuery?.toLowerCase()?.trim()) === -1 &&
                data.push({
                    key: JSON.stringify({
                        unique_id: uuidv4(),
                        change: 1,
                        tds_id: 0,
                        tds_name: searchChildQuery,
                        pms_default: 0
                    }),
                    value: searchChildQuery
                });
        }
        setChildSearchOptions(data);
    }, [childOptionsList]);

    const onSearchParent = useCallback(
        (query) => {
            setSearchChildQuery(query);
        },
        [searchChildQuery]
    );

    const onSelectParent = useCallback(
        (e) => {
            diagnosisData.push({
                ...e,
                since: "",
                status: "",
                note: "",
            });
            setDiagnosisData((prev) => [...prev]);
            setSelectedIndex(diagnosisData.length - 1);
            setSinceValue(1)
            setSearchChildQuery("")
        },
        [diagnosisData, selectedIndex, sinceValue]
    );

    const onRemoveRow = (index) => {
        diagnosisData.splice(index, 1);
        setDiagnosisData((prev) => [...prev]);
        setSelectedIndex(null)
    };

    // Tour Drag & Drop
    const [tourOpen, setTourOpen] = useState(false);
    const tourRef = useRef(null);

    useEffect(() => {
        // dispatch(updateDragDrop(''));
        setTimeout(() => {
            if (diagnosisData?.length > 1 && !dragDrop?.diagnosis) {
                setTourOpen(true)

            }
        }, 400);
    }, [diagnosisData]);

    const onTourHandle = () => {
        setTourOpen(!tourOpen)
        dispatch(updateDragDrop('diagnosis'));
    }

    const steps = [
        {
            description:
                <>
                    <div className="fw-medium fs-18 pt-3">Reorder chips <img className="img-fluid ms-2" src={tagNew} /></div>
                    <div className="pt-1">Hold and drag the chips to reorder them.</div>
                    <LoopingVideo
                      webm={dragChipsWebm}
                      mp4={dragChipsMp4}
                      className="img-fluid my-2 rounded-2"
                      style={{ backgroundColor: '#E2E2EA80' }}
                      width={329}
                      height={107}
                      ariaLabel="Drag to reorder"
                    />
                </>
            ,
            target: () => tourRef.current,
            nextButtonProps: {
                children: 'Okay',
                onClick: onTourHandle
            }
        }
    ];

    //Child Componet
    // const TABLE_DIAGNOSIS = useMemo(() => {
    //     return (
    //         diagnosisData.length > 0 &&
    //         diagnosisData.map((item, index) => {
    //             return (
    //                 <div key={index} style={{ width: item.tds_name.length > 12 && item.tds_name.length < 24 ? `${item.tds_name.length * 10.5}px` : item.tds_name.length >= 24 ? '256px' : '150px' }} className={`${selectedIndex == index && "closable-chips-active"} d-flex align-items-center justify-content-between text-truncate closable-chips`}>
    //                     <div className="text-truncate p-2" onClick={() => {
    //                         setSelectedIndex(index)
    //                         setSinceValue(item.since ? parseInt(item.since.split(" ")[0]) : 1)
    //                     }}>
    //                         <div className="text-truncate">{item.tds_name}
    //                             {(item.since || item.status || item.note) ? (
    //                                 <div className="text-truncate small">{`${item.since ? item.since + ' | ' : ''}${item.status ? item.status + ' | ' : ''}${item.note ? item.note : ''}`}</div>
    //                             ) : (
    //                                 <div className="text-truncate small">Add Details</div>
    //                             )}
    //                         </div>
    //                     </div>
    //                     <Button type="text" className="rounded-0 btn-close-chips" onClick={() => onRemoveRow(index)}>
    //                         <i className="icon-Cross"></i>
    //                     </Button>
    //                 </div>
    //             );
    //         })
    //     );
    // }, [diagnosisData, selectedIndex]);

    const SortableItem = SortableElement(({ item }) => (
        <div
            style={{
                width: item.tds_name.length > 12 && item.tds_name.length < 24
                    ? `${item.tds_name.length * 10.5}px`
                    : item.tds_name.length >= 24
                        ? '256px'
                        : '150px',
                zIndex: 9999,
            }}
            className={`${selectedIndex == item.index && "closable-chips-active"} d-flex align-items-center justify-content-between text-truncate closable-chips`}
        >
            <div className="text-truncate p-2" onClick={() => {
                setSelectedIndex(item.index)
                setSinceValue(item.since ? parseInt(item.since.split(" ")[0]) : 1)
            }}>
                <div className="text-truncate">{`${item.tds_name} ${item?.icd_code ? `(${item?.icd_code})` : ''}`}
                    {(item.since || item.status || item.note) ? (
                        <div className="text-truncate small">{`${item.since ? item.since + ' | ' : ''}${item.status ? item.status + ' | ' : ''}${item.note ? item.note : ''}`}</div>
                    ) : (
                        <div className="text-truncate small">Add Details</div>
                    )}
                </div>
            </div>
            <Button type="text" className="rounded-0 btn-close-chips" onClick={() => onRemoveRow(item.index)}>
                <i className="icon-Cross"></i>
            </Button>
        </div>
    ));

    const SortableList = SortableContainer(({ items }) => {
        return (
            <div className="d-flex flex-wrap">
                {items.map((item, index) => (
                    <SortableItem
                        key={`item-${index}`}
                        index={index}
                        item={{ ...item, index }}
                    />
                ))}
            </div>
        );
    });

    const TABLE_DIAGNOSIS = useMemo(() => {
        return (
            diagnosisData.length > 0 && (
                <SortableList
                    items={diagnosisData}
                    onSortEnd={({ oldIndex, newIndex }) => {
                        const newDiagnosisData = [...diagnosisData];
                        const [movedItem] = newDiagnosisData.splice(oldIndex, 1);
                        newDiagnosisData.splice(newIndex, 0, movedItem);
                        setDiagnosisData(newDiagnosisData);
                    }}
                    axis="xy"
                    pressDelay={100}
                />
            )
        );
    }, [diagnosisData, selectedIndex]);

    useEffect(() => {
        if (sinceValue !== -1) {
            const options = SINCE_OPTIONS.map((option) => {
                return {
                    key: Math.random(),
                    value: `${sinceValue} ${sinceValue <= 1 ? option.value : `${option.value}(s)`}`,
                    label: <>{`${sinceValue}${option.label}`}</>,
                };
            });
            setSinceOptions(options);
        } else if (inputSince.length > 0) {
            const options = SINCE_OPTIONS.map((option) => {
                return {
                    key: Math.random(),
                    value: `${inputSince} ${inputSince <= 1 ? option.value : `${option.value}(s)`}`,
                    label: <>{`${inputSince}${option.label}`}</>,
                };
            });
            setSinceOptions(options);
        } else {
            const options = SINCE_OPTIONS.map((option) => {
                return {
                    key: Math.random(),
                    value: `${option.value}`,
                    label: <>{`${option.label}`}</>,
                };
            });
            setSinceOptions(options);
        }
    }, [sinceValue]);

    const onChangeInputSinceChild = useCallback(
        (e) => {
            const updateQuery = onlyNumberFormat(e.target.value);
            setInputSince(updateQuery);
            diagnosisData[selectedIndex].since = '';
            setDiagnosisData((prev) => [...prev]);
            if (updateQuery.length > 0) {
                const options = SINCE_OPTIONS.map((option) => {
                    return {
                        key: Math.random(),
                        value: `${updateQuery} ${updateQuery <= 1 ? option.value : `${option.value}(s)`}`,
                        label: <>{`${updateQuery}${option.label}`}</>,
                    };
                });
                setSinceOptions(options);
            } else {
                const options = SINCE_OPTIONS.map((option) => {
                    return {
                        key: Math.random(),
                        value: `${option.value}`,
                        label: <>{`${option.label}`}</>,
                    };
                });
                setSinceOptions(options);
            }
        },
        [inputSince, sinceOptions, diagnosisData]
    );

    const SINCE_LIST = [
        { value: 1, label: 1 },
        { value: 2, label: 2 },
        { value: 3, label: 3 },
        { value: 4, label: 4 },
        { value: 5, label: 5 },
        { value: -1, label: <Input className="w-100 custom-segment-input inputheight45 border-0" placeholder="Custom" value={inputSince} inputMode="numeric" onChange={onChangeInputSinceChild} onClick={() => onChangeSegmentedSinceChild(-1)} /> }
    ];

    const STATUS_LIST = [
        { value: "Ruled Out", label: "Ruled Out" },
        { value: "Suspected", label: "Suspected" },
        { value: "Confirmed", label: "Confirmed" },
    ];

    const onChangeSegmentedSinceChild = useCallback(
        (key) => {
            setSinceValue(key)
            diagnosisData[selectedIndex].since = '';
            setDiagnosisData((prev) => [...prev]);
        },
        [sinceValue, selectedIndex, diagnosisData]
    );

    const onChangeSinceChild = useCallback(
        (key) => {
            if (hasNumber(key)) {
                if (key != diagnosisData[selectedIndex].since) {
                    diagnosisData[selectedIndex].since = key;
                } else {
                    diagnosisData[selectedIndex].since = '';
                }
                setDiagnosisData((prev) => [...prev]);
            }
        },
        [selectedIndex, diagnosisData]
    );

    const onChangeStatusChild = useCallback(
        (key) => {
            if (key != diagnosisData[selectedIndex].status) {
                diagnosisData[selectedIndex].status = key;
            } else {
                diagnosisData[selectedIndex].status = '';
            }
            setDiagnosisData((prev) => [...prev]);
        },
        [selectedIndex, diagnosisData]
    );
    const onChangeInputNoteChild = useCallback(
        (e) => {
            diagnosisData[selectedIndex].note = e.target.value;
            setDiagnosisData((prev) => [...prev]);
        },
        [selectedIndex, diagnosisData]
    );

    //Child Componet
    const CHILD_DRAWER_DATA = useMemo(() => {
        return (
            selectedIndex != null && diagnosisData[selectedIndex] !== undefined && (
                <>
                    <div className="h-100">
                        <div className="selectedchip-header d-flex flex-column justify-content-center title px-20">
                            <span className="text-truncate-twolines">{selectedIndex != null && diagnosisData[selectedIndex].tds_name}</span>
                        </div>
                        <div className="p-4">
                            <div>
                                <label className="title-common">
                                    Since
                                </label>
                                <div className="segement-static d-flex">
                                    {SINCE_LIST.map((item, i) => {
                                        return (
                                            <button key={i}
                                                type="button"
                                                className={`btn w-100 p-0 ${sinceValue > 5 ? item.value == -1 && 'btn-segement custom-input-selected' : sinceValue == item.value && 'btn-segement'}`}
                                                onClick={() => onChangeSegmentedSinceChild(item.value)}>
                                                {item.label}
                                            </button>
                                        )
                                    })}
                                </div>
                                {/* <Segmented
                                    value={sinceValue > 5 ? -1 : sinceValue}
                                    className="search-segment"
                                    options={SINCE_LIST}
                                    onChange={onChangeSegmentedSinceChild}
                                /> */}
                            </div>
                            <div className="mt-3">
                                <div className="segement-static d-flex">
                                    {sinceOptions.map((item, i) => {
                                        return (
                                            <button key={i}
                                                type="button"
                                                className={`btn w-100 ${selectedIndex != null && diagnosisData[selectedIndex].since == item.value && 'btn-segement'}`}
                                                onClick={() => onChangeSinceChild(item.value)}>
                                                {item.label}
                                            </button>
                                        )
                                    })}
                                </div>
                                {/* <Segmented
                                    value={selectedIndex != null && diagnosisData[selectedIndex].since}
                                    className="search-segment"
                                    options={sinceOptions}
                                    onChange={onChangeSinceChild}
                                /> */}
                            </div>
                            <div className="mt-5">
                                <label className="title-common">
                                    Status
                                </label>
                                <div className="segement-static d-flex">
                                    {STATUS_LIST.map((item, i) => {
                                        return (
                                            <button key={i}
                                                type="button"
                                                className={`btn w-100 ${selectedIndex != null && diagnosisData[selectedIndex].status == item.value && 'btn-segement'}`}
                                                onClick={() => onChangeStatusChild(item.value)}>
                                                {item.label}
                                            </button>
                                        )
                                    })}
                                </div>
                                {/* <Segmented
                                    value={selectedIndex != null && diagnosisData[selectedIndex].status}
                                    className="search-segment"
                                    options={STATUS_LIST}
                                    onChange={onChangeStatusChild}
                                /> */}
                            </div>

                            <div className="mt-5">
                                <label className="title-common">
                                    Add Details
                                </label>
                                <Input.TextArea value={selectedIndex != null && diagnosisData[selectedIndex].note} placeholder="Enter any specific details here" className="textareaPlaceholder" rows={3} onChange={onChangeInputNoteChild} />
                            </div>
                        </div>
                    </div>

                </>
            )
        );
    }, [selectedIndex, diagnosisData, sinceValue, inputSince, sinceOptions]);

    return (
        <>
            <Card bordered={false} className="search-modalCard h-100">
                <TabSearchHeader
                    placeholder="Search Diagnosis"
                    searchQuery={searchChildQuery}
                    disabled={diagnosisData.length > 0 ? false : true}
                    onSearchParent={onSearchParent}
                    onClose={onClose} />
                <div className="modalcard-body">
                    <Row gutter={0} className="h-100">
                        <Col md={14}>
                            <div className="bg-white h-100 p-14">
                                {diagnosisData.length > 0 && !searchChildQuery && (
                                    <>
                                        <div className="title2">
                                            Added
                                        </div>
                                        <div className="d-flex flex-wrap">
                                            <span ref={tourRef} className='pt-3'>
                                                {TABLE_DIAGNOSIS}
                                            </span>
                                            {/* <Tour placement="rightTop" closeIcon={false} open={tourOpen} steps={steps} onClose={onTourHandle} /> */}
                                        </div>
                                    </>
                                )}
                                <div className="d-flex" style={{ padding: "20px 0" }}>
                                <div>
                                    <img
                                        style={{ backgroundColor: "#22003C", borderRadius: "10px 10px 0px" }}
                                        className="me-3"
                                        src={apexAI}
                                        alt="apex-AI"
                                    />
                                </div>
                                    <div
                                    className="d-flex flex-column"
                                    style={{
                                        background: "rgba(119, 66, 254, 0.08)",
                                        borderRadius: 12,
                                        padding: "17px 20px",
                                        width: "100%",
                                    }}
                                    >
                                        <>
                                            <div style={{ fontSize: 16, fontWeight: 500 }}>
                                                Differential Diagnosis
                                            </div>
                                            <span className="ddx-ready-txt">These are symptoms associated with added diagnosis. Tap to add to EMR</span>
                                            <div
                                                className="d-flex align-items-center"
                                                style={{ padding: "15px 8px 0 8px", flexWrap: "wrap", gap: 16 }}
                                            >
                                                {ddxOptionsList?.filter(e => ![...diagnosisData.map(e1 => e1.tds_name)].includes(e.tds_name))?.map((item) => (
                                                <Button
                                                    type="button"
                                                    className="btn-41 btn ant-btn-text btn-input d-flex flex-column align-items-start justify-content-start test-name-btn"
                                                    style={{
                                                        height: 50,
                                                        gap: 8
                                                    }}
                                                    onClick={() => {
                                                        onSelectParent({ ...item });
                                                        window.Moengage.track_event(
                                                        "TP_CDSS_Ddx_selected",
                                                        {
                                                            clinic_name: getClinicName(profile?.hospital_data),
                                                            doctor_id: profile?.doctor_unique_id,
                                                            patient_number: patient_data?.pm_contact_no,
                                                            patient_id: patient_data?.patient_unique_id,
                                                            field: "ddx"
                                                        }
                                                    );
                                                    }}
                                                >
                                                    <span className="ddx-btn">{item?.tds_name}</span>
                                                    <div className="d-flex" style={{ columnGap: 2 }}>
                                                        {Array.from({
                                                        length: WarningRank[item?.likelihood] || 0,
                                                        }).map((_, index) => (
                                                        <div
                                                            key={index}
                                                            style={{
                                                            width: 13,
                                                            height: 4,
                                                            border: `2px solid ${WarningColor[item?.likelihood]}`,
                                                            borderRadius: 2,
                                                            }}
                                                        />
                                                        ))}
                                                    </div>
                                                </Button>
                                                ))}
                                            </div>
                                        </>
                                    </div>
                                </div>
                                <div>
                                    <div className="title2">
                                        {searchChildQuery.length > 0 ? 'Search Results' : 'Frequently Used'}
                                    </div>
                                    <div className="mt-3">
                                        {searchChildQuery.length > 0 ? (
                                            childSearchOptions.length > 0 &&
                                            childSearchOptions.filter(e => ![...diagnosisData.map(e1 => e1.tds_name)].includes(e.value)).map((item, i) => {
                                                return (
                                                    // i === childSearchOptions.length - 1 ? (
                                                    JSON.parse(item.key).change === 1 ? (
                                                        <Button
                                                            key={i}
                                                            type="text"
                                                            className="btn btn-primary2 chips-custom mb-14 chips-addCustom chips-height"
                                                            onClick={() => onSelectParent({ ...JSON.parse(item.key) })}>
                                                            "{item.value}" <i className="icon-Add mx-2 fs-6"></i> <a className="fw-medium text-decoration-underline text-primary"> Add Custom</a>
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            key={i}
                                                            type="text"
                                                            style={{ width: item.value.length > 26 && '250px' }}
                                                            className={`${item.value.length > 26 && 'chips-custom-break'} btn btn-primary2 chips-custom mb-14 me-14`}
                                                            onClick={() => onSelectParent({ ...JSON.parse(item.key) })}>
                                                            {item.value}
                                                        </Button>
                                                    )
                                                )
                                            })
                                        ) : (
                                            parentOptionsList.length > 0 &&
                                            parentOptionsList.filter(e => ![...diagnosisData.map(e1 => e1.tds_name)].includes(e.tds_name)).map((item, i) => {
                                                return (
                                                    <Button key={i} type="text" style={{ width: item?.tds_name?.length > 26 && '250px' }} className={`${item?.tds_name?.length > 26 && 'chips-custom-break'} btn btn-primary2 chips-custom mb-14 me-14`} onClick={() => onSelectParent({ ...item, unique_id: uuidv4() })}>{item?.tds_name}</Button>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Col>
                        <Col md={10}>
                            {CHILD_DRAWER_DATA}
                        </Col>
                    </Row>
                </div>
            </Card>
        </>
    );
}

export default React.memo(TabDiagnosisSearch);
