import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import { Button, Card, Row, Col, Input, Tour } from 'antd';

import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';

import { capitalizeAfterSentence } from "../../utils/utils";

import CashManagerContext from '../../context/CashManagerContext';
import {
    searchExamination
} from "../../redux/examinationSlice";
import { updateDragDrop } from "../../redux/doctorsSlice";

import LoopingVideo from "../common/LoopingVideo";
import TabSearchHeader from "./TabSearchHeader";

import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { setIsDDxReadyToGenerate } from "../../redux/ddxSlice";
import { ASSETS } from "../../assets";
const {
  dragChips_2: dragChipsWebm,
  dragChips: dragChipsMp4,
  tagNew,
} = ASSETS.images;

function TabExaminationSearch({ passIndex, onClose }) {

    const {
        parentOptionsList,
        childOptionsList,
    } = useSelector((state) => state.examination);
    const { dragDrop } = useSelector((state) => state.doctors);
    const dispatch = useDispatch();

    const { examinationData, setExaminationData } = useContext(CashManagerContext);

    const [searchChildQuery, setSearchChildQuery] = useState("");
    const [childSearchOptions, setChildSearchOptions] = useState([]);

    const [selectedIndex, setSelectedIndex] = useState(passIndex);

    //Parent AutoComplete
    useEffect(() => {
        if (searchChildQuery) {
            const timeOutId = setTimeout(() => {
                dispatch(
                    searchExamination({ searchQuery: searchChildQuery, type: "child" })
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
                value: e.examination_name
            });
        });
        if (searchChildQuery.length > 0) {
            searchChildQuery && childOptionsList.findIndex(e => e.examination_name?.toLowerCase()?.trim() == searchChildQuery?.toLowerCase()?.trim()) === -1 && 
                data.push({
                    key: JSON.stringify({
                        unique_id: uuidv4(),
                        change: 1,
                        pms_default: 0,
                        examination_name: searchChildQuery
                    }),
                    value: searchChildQuery
                });
        }
        setChildSearchOptions(data);
    }, [childOptionsList]);

    const onSearchParent = useCallback(
        (query) => {
            setSearchChildQuery(query);
            // ?.replace(/,/g, '')
        },
        [searchChildQuery]
    );

    const onSelectParent = useCallback(
        (e) => {
            examinationData.push({
                ...e,
                note: "",
            });
            setExaminationData((prev) => [...prev]);
            setSelectedIndex(examinationData.length - 1);
            setSearchChildQuery("")
        },
        [examinationData, selectedIndex]
    );

    const onRemoveRow = (index) => {
        examinationData.splice(index, 1);
        setExaminationData((prev) => [...prev]);
        setSelectedIndex(null)
    };

    // Tour Drag & Drop
    const [tourOpen, setTourOpen] = useState(false);
    const tourRef = useRef(null);

    useEffect(() => {
        // dispatch(updateDragDrop(''));
        setTimeout(() => {
            if (examinationData?.length > 1 && !dragDrop?.examination) {
                setTourOpen(true)

            }
        }, 400);
    }, [examinationData]);

    const onTourHandle = () => {
        setTourOpen(!tourOpen)
        dispatch(updateDragDrop('examination'));
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
    // const TABLE_EXAMINATION = useMemo(() => {
    //     return (
    //         examinationData.length > 0 &&
    //         examinationData.map((item, index) => {
    //             return (
    //                 <div key={index} style={{ width: item.examination_name.length > 12 && item.examination_name.length < 24 ? `${item.examination_name.length * 10.5}px` : item.examination_name.length >= 24 ? '256px' : '150px' }} className={`${selectedIndex == index && "closable-chips-active"} d-flex align-items-center justify-content-between text-truncate closable-chips`}>
    //                     <div className="text-truncate p-2" onClick={() => {
    //                         setSelectedIndex(index)
    //                     }}>
    //                         <div className="text-truncate">{item.examination_name}
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
    // }, [examinationData, selectedIndex]);

    // Drag & Drop
    const SortableItem = SortableElement(({ item }) => (
        <div
            style={{
                width: item.examination_name.length > 12 && item.examination_name.length < 24
                    ? `${item.examination_name.length * 10.5}px`
                    : item.examination_name.length >= 24
                        ? '256px'
                        : '150px',
                zIndex: 9999,
            }}
            className={`${selectedIndex == item.index && "closable-chips-active"} d-flex align-items-center justify-content-between text-truncate closable-chips`}
        >
            <div className="text-truncate p-2" onClick={() => {
                setSelectedIndex(item.index)
            }}>
                <div className="text-truncate">{item.examination_name}
                    {item.note ? (
                        <div className="text-truncate small">{item.note}</div>
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

    const TABLE_EXAMINATION = useMemo(() => {
        return (
            examinationData.length > 0 && (
                <SortableList
                    items={examinationData}
                    onSortEnd={({ oldIndex, newIndex }) => {
                        const newExaminationData = [...examinationData];
                        const [movedItem] = newExaminationData.splice(oldIndex, 1);
                        newExaminationData.splice(newIndex, 0, movedItem);
                        setExaminationData(newExaminationData);
                    }}
                    axis="xy"
                    pressDelay={100}
                />
            )
        );
    }, [examinationData, selectedIndex]);

    const onChangeInputNoteChild = useCallback(
        (e) => {
            examinationData[selectedIndex].note = e.target.value;
            // ?.replace(/,/g, '')
            setExaminationData((prev) => [...prev]);
        },
        [selectedIndex, examinationData]
    );

    //Child Componet
    const CHILD_DRAWER_DATA = useMemo(() => {
        return (
            selectedIndex != null && examinationData[selectedIndex] !== undefined && (
                <>
                    <div className="h-100">
                        <div className="selectedchip-header d-flex flex-column justify-content-center title px-20">
                            <span className="text-truncate-twolines">{selectedIndex != null && examinationData[selectedIndex].examination_name}</span>
                        </div>
                        <div className="p-4">
                            <label className="title-common">
                                Add Details
                            </label>
                            <Input.TextArea value={selectedIndex != null && examinationData[selectedIndex].note} placeholder="Enter any specific details here" className="textareaPlaceholder" rows={3} onChange={onChangeInputNoteChild} />
                        </div>
                    </div>

                </>
            )
        );
    }, [selectedIndex, examinationData]);

    const handleClose = () => {
        onClose();
        if (examinationData?.length > 0) {
            dispatch(setIsDDxReadyToGenerate(true));
        }
    };

    return (
        <>
            <Card bordered={false} className="search-modalCard h-100">
                <TabSearchHeader
                    placeholder="Search Examinations"
                    searchQuery={searchChildQuery}
                    onSearchParent={onSearchParent}
                    disabled={examinationData.length > 0 ? false : true}
                    onClose={handleClose} />
                <div className="modalcard-body">
                    <Row gutter={0} className="h-100">
                        <Col md={14}>
                            <div className="bg-white h-100 p-14">
                                {examinationData.length > 0 && !searchChildQuery && (
                                    <>
                                        <div className="title2">
                                            Added
                                        </div>
                                        <div className="d-flex flex-wrap">
                                            <span ref={tourRef} className='pt-3'>
                                                {TABLE_EXAMINATION}
                                            </span>
                                            {/* <Tour placement="rightTop" closeIcon={false} open={tourOpen} steps={steps} onClose={onTourHandle} /> */}
                                        </div>
                                    </>
                                )}
                                <div>
                                    <div className="title2">
                                        {searchChildQuery.length > 0 ? 'Search Results' : 'Frequently Used'}
                                    </div>
                                    <div className="mt-3">
                                        {console.log(childSearchOptions)}
                                        {console.log(childSearchOptions.filter(e => ![...examinationData.map(e1 => e1.examination_name)].includes(e.value)))}
                                        {searchChildQuery.length > 0 ? (
                                            childSearchOptions.length > 0 &&
                                            childSearchOptions.filter(e => ![...examinationData.map(e1 => e1.examination_name)].includes(e.value)).map((item, i) => {
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
                                            parentOptionsList.filter(e => ![...examinationData.map(e1 => e1.examination_name)].includes(e.examination_name)).map((item, i) => {
                                                return (
                                                    <Button key={i} type="text" style={{ width: item.examination_name.length > 26 && '250px' }} className={`${item.examination_name.length > 26 && 'chips-custom-break'} btn btn-primary2 chips-custom mb-14 me-14`} onClick={() => onSelectParent({ ...item, unique_id: uuidv4() })}>{item.examination_name}</Button>
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

export default React.memo(TabExaminationSearch);
