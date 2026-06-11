import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import { Button, Card, Row, Col, Input, Tour } from 'antd';

import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import CashManagerContext from '../../context/CashManagerContext';
import {
    searchInvestigation
} from "../../redux/investigationSlice";
import { updateDragDrop } from "../../redux/doctorsSlice";

import TabSearchHeader from "./TabSearchHeader";
import LoopingVideo from "../common/LoopingVideo";

import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { getClinicName } from "../../utils/utils";
import { useLocation } from "react-router-dom";
import { getDecodedToken } from "../../utils/localStorage";
import { GB_APOLLO_DISABLE_FEATURE, GB_ZYDUS_USER } from "../../utils/constants";
import { useChikitsalay } from "../../pages/chikitsalay/useChikitsalay";
import { env } from "../../EnvironmentConfig";
import { ASSETS } from "../../assets";
const {
  dragChips_2: dragChipsWebm,
  dragChips: dragChipsMp4,
  apexai: apexAI,
  tagNew,
} = ASSETS.images;

function TabInvestigationSearch({ passIndex, onClose, ddxOptionsList }) {
    const isChikitsalayAccessable = useChikitsalay();

    const {
        parentOptionsList,
        childOptionsList,
    } = useSelector((state) => state.investigation);
    const { dragDrop } = useSelector((state) => state.doctors);
    const dispatch = useDispatch();

    const { profile } = useSelector((state) => state.doctors);

    const { state } = useLocation();
    const { patient_data } = state;
    const { investigationData, setInvestigationData } = useContext(CashManagerContext);

    const [searchChildQuery, setSearchChildQuery] = useState("");
    const [childSearchOptions, setChildSearchOptions] = useState([]);

    const [selectedIndex, setSelectedIndex] = useState(passIndex);

    const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
    const decodedToken = getDecodedToken();
    const tokenData = decodedToken?.result;

    const isApolloHosBusinessIdAccessableFromGB = useFeatureIsOn(GB_APOLLO_DISABLE_FEATURE);

    //Parent AutoComplete
    useEffect(() => {
        if (searchChildQuery) {
            const timeOutId = setTimeout(() => {
                dispatch(
                    searchInvestigation({ searchQuery: searchChildQuery, type: "child" })
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
                value: e.investigation_name
            });
        });
        if (searchChildQuery.length > 0) {
            searchChildQuery && childOptionsList.findIndex(e => e.investigation_name?.toLowerCase()?.trim() == searchChildQuery?.toLowerCase()?.trim()) === -1 && tokenData?.hospital_business_id != env.zydus_business_id && !isZydusUserAccessableFromGB && !isApolloHosBusinessIdAccessableFromGB &&
                data.push({
                    key: JSON.stringify({
                        unique_id: uuidv4(),
                        change: 1,
                        investigation_name: searchChildQuery
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
            window.Moengage.track_event("investigation_select", {
                "value": e.investigation_name
            });
            investigationData.push({
                ...e,
                note: "",
            });
            setInvestigationData((prev) => [...prev]);
            setSelectedIndex(investigationData.length - 1);
            setSearchChildQuery("")
        },
        [investigationData, selectedIndex]
    );

    const onRemoveRow = (index) => {
        investigationData.splice(index, 1);
        setInvestigationData((prev) => [...prev]);
        setSelectedIndex(null)
    };

    // Tour Drag & Drop
    const [tourOpen, setTourOpen] = useState(false);
    const tourRef = useRef(null);

    useEffect(() => {
        // dispatch(updateDragDrop(''));
        setTimeout(() => {
            if (investigationData?.length > 1 && !dragDrop?.lab_investigation) {
                setTourOpen(true)

            }
        }, 400);
    }, [investigationData]);

    const onTourHandle = () => {
        setTourOpen(!tourOpen)
        dispatch(updateDragDrop('lab_investigation'));
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
    // const TABLE_INVESTIGATION = useMemo(() => {
    //     return (
    //         investigationData.length > 0 &&
    //         investigationData.map((item, index) => {
    //             return (
    //                 <div key={index} style={{ width: item.investigation_name.length > 12 && item.investigation_name.length < 24 ? `${item.investigation_name.length * 10.5}px` : item.investigation_name.length >= 24 ? '256px' : '150px' }} className={`${selectedIndex == index && "closable-chips-active"} d-flex align-items-center justify-content-between text-truncate closable-chips`}>
    //                     <div className="text-truncate p-2" onClick={() => {
    //                         setSelectedIndex(index)
    //                     }}>
    //                         <div className="text-truncate">{item.investigation_name}
    //                             {item.note ? (
    //                                 <div className="text-truncate small">{item.note}</div>
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
    // }, [investigationData, selectedIndex]);

    // Drag & Drop
    const SortableItem = SortableElement(({ item }) => {
        const showVC = item?.hm_type == 15 && Number(item?.um_id) === 0 && isChikitsalayAccessable;
        return (
            <div
                style={{
                    width: item.investigation_name.length > 12 && item.investigation_name.length < 24
                        ? `${item.investigation_name.length * 10.5}px`
                        : item.investigation_name.length >= 24
                            ? '256px'
                            : '150px',
                    zIndex: 9999,
                }}
                className={`${selectedIndex == item.index && "closable-chips-active"} position-relative d-flex align-items-center justify-content-between closable-chips`}
            >
                <div className="text-truncate p-2" onClick={() => {
                    setSelectedIndex(item.index)
                }}>
                    <div className="text-truncate"><span className="chip-text">{item.investigation_name}</span>
                        {item.note ? (
                            <div className="text-truncate small">{item.note}</div>
                        ) : (
                            <div className="text-truncate small">Add Details</div>
                        )}
                    </div>
                </div>
                {showVC && (
                    <span
                        className="position-absolute align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-pill text-white chip-vc-badge"
                        style={{ minWidth: 24, height: 18, padding: "0 5px", lineHeight: "16px", background: "#c44ea2", right: 36, top: -6 }}
                    >
                        VC
                    </span>
                )}
                <Button type="text" className="rounded-0 btn-close-chips" onClick={() => onRemoveRow(item.index)}>
                    <i className="icon-Cross"></i>
                </Button>
            </div>
        );
    });

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

    const TABLE_INVESTIGATION = useMemo(() => {
        return (
            investigationData.length > 0 && (
                <SortableList
                    items={investigationData}
                    onSortEnd={({ oldIndex, newIndex }) => {
                        const newInvestigationData = [...investigationData];
                        const [movedItem] = newInvestigationData.splice(oldIndex, 1);
                        newInvestigationData.splice(newIndex, 0, movedItem);
                        setInvestigationData(newInvestigationData);
                    }}
                    axis="xy"
                    pressDelay={100}
                />
            )
        );
    }, [investigationData, selectedIndex]);

    const onChangeInputNoteChild = useCallback(
        (e) => {
            investigationData[selectedIndex].note = e.target.value;
            setInvestigationData((prev) => [...prev]);
        },
        [selectedIndex, investigationData]
    );

    //Child Componet
    const CHILD_DRAWER_DATA = useMemo(() => {
        return (
            selectedIndex != null && investigationData[selectedIndex] !== undefined && (
                <>
                    <div className="h-100">
                        <div className="selectedchip-header d-flex flex-column justify-content-center title px-20">
                            <span className="text-truncate-twolines">{selectedIndex != null && investigationData[selectedIndex].investigation_name}</span>
                        </div>
                        <div className="p-4">
                            <Input.TextArea value={selectedIndex != null && investigationData[selectedIndex].note} placeholder="Enter any specific details here" className="textareaPlaceholder" rows={3} onChange={onChangeInputNoteChild} />
                        </div>
                    </div>

                </>
            )
        );
    }, [selectedIndex, investigationData]);

    return (
        <>
            <Card bordered={false} className="search-modalCard h-100">
                <TabSearchHeader
                    placeholder="Search Investigation"
                    searchQuery={searchChildQuery}
                    onSearchParent={onSearchParent}
                    disabled={investigationData.length > 0 ? false : true}
                    onClose={onClose} />
                <div className="modalcard-body">
                    <Row gutter={0} className="h-100">
                        <Col md={14}>
                            <div className="bg-white h-100 p-14">
                                {investigationData.length > 0 && !searchChildQuery && (
                                    <>
                                        <div className="title2">
                                            Added
                                        </div>
                                        <div className="d-flex flex-wrap">
                                            <span ref={tourRef} className='pt-3'>
                                                {TABLE_INVESTIGATION}
                                            </span>
                                            {/* <Tour placement="rightTop" closeIcon={false} open={tourOpen} steps={steps} onClose={onTourHandle} /> */}
                                        </div>
                                    </>
                                )}
                                {ddxOptionsList?.length > 0 && <div className="d-flex" style={{ padding: "20px 0" }}>
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
                                                Suggested Tests
                                            </div>
                                            <span className="ddx-ready-txt">These are suggested tests with added diagnosis. Tap to add to EMR</span>
                                            <div
                                                className="d-flex align-items-center"
                                                style={{ padding: "15px 8px 0 8px", flexWrap: "wrap", gap: 16 }}
                                            >
                                                {ddxOptionsList?.filter(e => ![...investigationData.map(e1 => e1.investigation_name)].includes(e.investigation_name))?.map((item) => (
                                                <Button
                                                    type="button"
                                                    className="btn-41 btn ant-btn-text btn-input d-flex align-items-center justify-content-between test-name-btn"
                                                    onClick={() => {
                                                        onSelectParent({ ...item });
                                                        window.Moengage.track_event("TP_CDSS_addtoRx", {
                                                            clinic_name: getClinicName(profile?.hospital_data),
                                                            doctor_id: profile?.doctor_unique_id,
                                                            patient_number: patient_data?.pm_contact_no,
                                                            patient_id: patient_data?.patient_unique_id,
                                                            field: "apexDDx",
                                                        });
                                                    }}
                                                >
                                                    <span className="ddx-btn">
                                                        {item?.investigation_name}
                                                    </span>
                                                </Button>
                                                ))}
                                            </div>
                                        </>
                                    </div>
                                </div>}
                                <div>
                                    <div className="title2">
                                        {searchChildQuery.length > 0 ? 'Search Results' : 'Frequently Used'}
                                    </div>
                                    <div className="mt-3 d-flex flex-wrap">
                                        {searchChildQuery.length > 0 ? (
                                            childSearchOptions.length > 0 &&
                                            childSearchOptions.filter(e => ![...investigationData.map(e1 => e1.investigation_name)].includes(e.value)).map((item, i) => {
                                                return (
                                                    <div className="position-relative">
                                                        {/* i === childSearchOptions.length - 1 ? ( */}
                                                        {JSON.parse(item.key).change === 1 ? (
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
                                                        )}
                                                        {(JSON.parse(item.key)?.hm_type === 1 && JSON.parse(item.key)?.um_id === 0) && <span className="position-absolute align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-circle text-white" style={{width: 18, height: 18, background: '#c44ea2', right: 6, top: -6}}>Z</span>}
                                                        {(JSON.parse(item.key)?.hm_type == 15 && Number(JSON.parse(item.key)?.um_id) === 0 && isChikitsalayAccessable) && <span className="position-absolute align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-pill text-white" style={{minWidth: 24, height: 18, padding: '0 5px', lineHeight: '16px', background: '#c44ea2', right: 6, top: -6}}>VC</span>}
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            parentOptionsList.length > 0 &&
                                            parentOptionsList.filter(e => ![...investigationData.map(e1 => e1.investigation_name)].includes(e.investigation_name)).map((item, i) => {
                                                return (
                                                    <div className="position-relative">
                                                        <Button key={i} type="text" style={{ width: item.investigation_name.length > 26 && '250px' }} className={`${item.investigation_name.length > 26 && 'chips-custom-break'} btn btn-primary2 chips-custom mb-14 me-14`} onClick={() => onSelectParent({ ...item, unique_id: uuidv4() })}>{item.investigation_name}</Button>
                                                        {(item?.hm_type === 1 && item?.um_id === 0) && <span className="position-absolute align-items-center small fs-12-1 lh-1 d-inline-flex justify-content-center rounded-circle text-white" style={{width: 18, height: 18, background: '#c44ea2', right: 6, top: -6}}>Z</span>}
                                                        {(item?.hm_type == 15 && Number(item?.um_id) === 0 && isChikitsalayAccessable) && <span className="position-absolute align-items-center small fs-12-1 lh-1 d-inline-flex justify-content-center rounded-pill text-white" style={{minWidth: 24, height: 18, padding: '0 5px', lineHeight: '16px', background: '#c44ea2', right: 6, top: -6}}>VC</span>}
                                                    </div>
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

export default React.memo(TabInvestigationSearch);