import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { Button, Card, Row, Col, Checkbox, Input } from 'antd';

import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';

import CashManagerContext from '../../context/CashManagerContext';
import { removeBeforeWhiteSpace, capitalizeAfterSentence } from "../../utils/utils";
import {
    searchAdvice
} from "../../redux/adviceSlice";
import { MenuOutlined } from '@ant-design/icons';
import TabSearchHeader from "./TabSearchHeader";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

function TabAdviceSearch({ passIndex, onClose }) {

    const {
        parentOptionsList,
        childOptionsList,
    } = useSelector((state) => state.advice);
    const dispatch = useDispatch();

    const { adviceData, setAdviceData } = useContext(CashManagerContext);

    const [searchChildQuery, setSearchChildQuery] = useState("");
    const [childSearchOptions, setChildSearchOptions] = useState([]);

    const [childDrawerData, setChildDrawerData] = useState(null);

    //Parent AutoComplete
    useEffect(() => {
        if (searchChildQuery) {
            const timeOutId = setTimeout(() => {
                dispatch(
                    searchAdvice({ searchQuery: searchChildQuery, type: "child" })
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
                value: e.advice_name
            });
        });
        if (searchChildQuery.length > 0) {
            searchChildQuery && childOptionsList.findIndex(e => e.advice_name?.toLowerCase()?.trim() == searchChildQuery?.toLowerCase()?.trim()) === -1 &&
                data.push({
                    key: JSON.stringify({
                        unique_id: uuidv4(),
                        change: 1,
                        pms_default: 0,
                        advice_name: searchChildQuery
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
            adviceData.push({
                ...e,
            });
            setAdviceData((prev) => [...prev]);
            setSearchChildQuery("")
        },
        [adviceData]
    );

    const onRemoveRow = (index) => {
        adviceData.splice(index, 1);
        setAdviceData((prev) => [...prev]);
    };

    //Child Componet
    // const TABLE_ADVICE = useMemo(() => {
    //     return (
    //         adviceData.length > 0 &&
    //         adviceData.map((item, index) => {
    //             return (
    //                 <div className={`${childDrawerData && childDrawerData.index == index && "bg-selected"} d-flex align-items-center justify-content-between border-bottom py-1 px-2`}>
    //                     <Checkbox checked onClick={() => onRemoveRow(index)}><div className="text-truncate-twolines">{item.advice_name}</div></Checkbox>
    //                     <Button className="focus-none btn px-1 btn-delete-prescription" onClick={() => childDrawerData && childDrawerData.index == index ? setChildDrawerData(null) : setChildDrawerData({ ...item, index: index })}><i className={`${childDrawerData && childDrawerData.index == index ? "icon-Cross" : "icon-Edit"} text-main fs-21`}></i></Button>
    //                 </div>
    //             );
    //         })
    //     );
    // }, [adviceData, childDrawerData]);

    const reorder = (list, startIndex, endIndex) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };
    const onDragEnd = (result) => {
        if (!result.destination) return;
        const reorderedItems = reorder(
            adviceData,
            result.source.index,
            result.destination.index
        );
        setAdviceData(reorderedItems);
    };

    const TABLE_ADVICE = useMemo(() => {
        return (
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="advice" direction="vertical">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}>
                            {adviceData.length > 0 &&
                                adviceData.map((item, index) => (
                                    <Draggable key={index} draggableId={`advice-${index}`} index={index}>
                                        {(provided) => (
                                            <Row
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                key={index}
                                                gutter={[0]}
                                                className="h-38 align-items-center"
                                            >
                                                <Col lg={1} md={1} sm={1} xs={1} className="text-center">
                                                    <MenuOutlined
                                                        {...provided.dragHandleProps}
                                                        className="drag-handle"
                                                        style={{ cursor: 'grab' }}
                                                    >
                                                    </MenuOutlined>
                                                </Col>
                                                <Col lg={23} md={23} sm={23} xs={23} className='px-2 d-flex justify-content-between align-items-center'>
                                                    <Checkbox checked onClick={() => onRemoveRow(index)}><div className="text-truncate-twolines">{item.advice_name}</div></Checkbox>
                                                    {item?.pms_default === 0 && <Button className="btn btn-delete-prescription p-0" onClick={() => childDrawerData && childDrawerData.index == index ? setChildDrawerData(null) : setChildDrawerData({ ...item, index: index })}><i className={`${childDrawerData && childDrawerData.index == index ? "icon-Cross" : "icon-Edit"} text-main fs-21`}></i></Button>}
                                                </Col>
                                            </Row>
                                        )}
                                    </Draggable>
                                ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        );
    }, [adviceData, childDrawerData]);

    const onChangeInputNoteChild = useCallback(
        (e) => {
            const updateQuery = removeBeforeWhiteSpace(e.target.value)
            // ?.replace(/,/g, '')
            setChildDrawerData({ ...childDrawerData, advice_name: updateQuery })
        },
        [childDrawerData]
    );

    const updateChild = (item) => {
        const { index, ...updatedReqData } = item;
        console.log(adviceData[item.index].advice_name, updatedReqData.advice_name)
        if (adviceData[item.index].advice_name != updatedReqData.advice_name) {
            updatedReqData["change"] = 1
        }
        adviceData[item.index] = { ...adviceData[item.index], ...updatedReqData };
        setAdviceData((prev) => [...prev]);
        setChildDrawerData(null)
    }

    //Child Componet
    const CHILD_DRAWER_DATA = useMemo(() => {
        return (
            childDrawerData && (
                <>
                    <div className="h-100">
                        <div className="selectedchip-header d-flex flex-column justify-content-center title px-20">
                            <span className="text-truncate-twolines">{'Edit Advice'}</span>
                        </div>
                        <div className="p-4">
                            <Input.TextArea value={childDrawerData.advice_name !== undefined && childDrawerData.advice_name} placeholder="Enter any specific details here" className="textareaPlaceholder" rows={3} onChange={onChangeInputNoteChild} />
                            <Button className='btn btn-primary3 float-end mt-3 btn-41 px-4' onClick={() => updateChild(childDrawerData)}>
                                Save
                            </Button>
                        </div>

                    </div>

                </>
            )
        );
    }, [childDrawerData]);

    return (
        <>
            <Card bordered={false} className="search-modalCard h-100">
                <TabSearchHeader
                    placeholder="Search Advices"
                    searchQuery={searchChildQuery}
                    disabled={adviceData.length > 0 ? false : true}
                    onSearchParent={onSearchParent}
                    onClose={onClose} />
                <div className="modalcard-body">
                    <Row gutter={0} className="h-100">
                        <Col md={14}>
                            <div className="bg-white h-100 p-14">
                                {adviceData.length > 0 && !searchChildQuery && (
                                    <>
                                        <div className="title2">
                                            Selected Advices
                                        </div>
                                        <div className="mt-3 mb-3">
                                            {TABLE_ADVICE}
                                        </div>
                                    </>
                                )}
                                <div>
                                    <div className="title2">
                                        {searchChildQuery.length > 0 ? 'Search Results' : 'Frequently Used'}
                                    </div>
                                    <div className="mt-3">
                                        {searchChildQuery.length > 0 ? (
                                            childSearchOptions.length > 0 &&
                                            childSearchOptions.filter(e => ![...adviceData.map(e1 => e1.advice_name)].includes(e.value)).map((item, i) => {
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
                                            parentOptionsList.filter(e => ![...adviceData.map(e1 => e1.advice_name)].includes(e.advice_name)).map((item, i) => {
                                                return (
                                                    <Button key={i} type="text" style={{ width: item.advice_name.length > 26 && '250px' }} className={`${item.advice_name.length > 26 && 'chips-custom-break'} btn btn-primary2 chips-custom mb-14 me-14`} onClick={() => onSelectParent({ ...item, unique_id: uuidv4() })}>{item.advice_name}</Button>
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

export default React.memo(TabAdviceSearch);
