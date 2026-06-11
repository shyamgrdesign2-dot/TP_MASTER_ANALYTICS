import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { Input, Button, Drawer, Tabs, Select, Card, Spin, Tooltip } from 'antd';

import { LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';

import CommonModal from '../../common/CommonModal';

import CashManagerContext from '../../context/CashManagerContext';
import { errorMessage, removeBeforeWhiteSpace, capitalizeAfterSentence } from "../../utils/utils";

import {
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getExaminationTemplates,
    getFrequentlySearchedExamination,
    singleTemplateDetails,
} from "../../redux/examinationSlice";

import TabExaminationSearch from "../../components/tab_design/TabExaminationSearch";
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { setIsDDxReadyToGenerate } from "../../redux/ddxSlice";
import { ASSETS } from "../../assets";
const {
  alerticon: alertIcon,
  examination: Examinationicon,
} = ASSETS.images;

function TabExaminationBox() {
    const {
        selectedExaminationList,
        parentOptionsList,
        templates,
        loading,
    } = useSelector((state) => state.examination);
    const dispatch = useDispatch();

    const { examinationData, setExaminationData, symptomsData } = useContext(CashManagerContext);
    // const [ examinationData, setExaminationData] = useState([]);

    const [parentDrawer, setParentDrawer] = useState(false);
    const [childDrawer, setChildDrawer] = useState(false);
    const [childDrawerData, setChildDrawerData] = useState(null);

    const [templateDrawer, setTemplateDrawer] = useState(false);
    const [allTemplates, setAllTemplates] = useState([]);
    const [matchedTemplates, setMatchedTemplates] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalOpen1, setIsModalOpen1] = useState(false);
    const [removeTemplateId, setRemoveTemplateId] = useState(null);
    const [saveDrawer, setSaveDrawer] = useState(false);

    const [inputTemplateName, setInputTemplateName] = useState(null);
    const TAB_ADD_TEMPLATE = 1;
    const TAB_UPDATE_TEMPLATE = 2;
    const ADD_EDIT_TEMPLATE_TABS = [
        { key: TAB_ADD_TEMPLATE, label: "New Template" },
        { key: TAB_UPDATE_TEMPLATE, label: "Update Template" },
    ];
    const [tabChange, setTabChange] = useState(TAB_ADD_TEMPLATE);

    const [selectedIndex, setSelectedIndex] = useState(null);

    useEffect(() => {
        if (selectedExaminationList.length > 0) {
            const updatedData = examinationData.map((e, i) => {
                return { ...e, ...selectedExaminationList[i] };
            });
            setExaminationData(updatedData);
        }
    }, [selectedExaminationList]);

    useEffect(() => {
        dispatch(getExaminationTemplates());
        dispatch(getFrequentlySearchedExamination());
    }, []);

    useEffect(() => {
        setMatchedTemplates(templates);
        setAllTemplates(templates);
    }, [templates]);

    const onRemoveRow = (index) => {
        examinationData.splice(index, 1);
        setExaminationData((prev) => [...prev]);
        setSelectedIndex(null);
        if (examinationData?.length > 0) {
            dispatch(setIsDDxReadyToGenerate(true));
        } else if (symptomsData?.length === 0) {
            dispatch(setIsDDxReadyToGenerate(false));
        }
    };

    // Handle Parent Drawer
    const handleDrawerParent = useCallback(() => {
        setParentDrawer(!parentDrawer);
    }, [parentDrawer]);

    const onSelectParent = useCallback(
        (e) => {
            examinationData.push({
                ...e,
                note: "",
            });
            setExaminationData((prev) => [...prev]);
            setSelectedIndex(examinationData.length - 1);
            handleDrawerParent()
        },
        [examinationData, selectedIndex, parentDrawer]
    );

    // Handle Child Drawer
    const handleDrawerChild = useCallback((item) => {
        setChildDrawer(!childDrawer);
        setChildDrawerData(item)
    }, [childDrawer, childDrawerData]);

    // Handle Template Drawer
    const handleDrawerTemplate = useCallback(() => {
        setTemplateDrawer(!templateDrawer);
    }, [templateDrawer]);

    // Handle Save Drawer
    const handleDrawerSave = useCallback(() => {
        setInputTemplateName(null);
        setSaveDrawer(!saveDrawer);
    }, [saveDrawer]);

    const onTabChange = useCallback(
        (key) => {
            setInputTemplateName(null);
            setTabChange(key);
        },
        [tabChange]
    );

    const onSearch = (e) => {
        const searchQuery = e.target.value;
        if (searchQuery) {
            let filteredTemplates = templates.filter((template) => {
                return template.tet_template_name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());
            });
            setMatchedTemplates(filteredTemplates);
        } else {
            setMatchedTemplates(templates);
        }
    };

    const onTemplateSelected = async (template) => {
        const action = await dispatch(singleTemplateDetails(template.tet_id));
        if (action.meta.requestStatus === "fulfilled") {
            const updatedData = action?.payload;
            setExaminationData([...examinationData, ...updatedData]);
            handleDrawerTemplate();
        } else {
            errorMessage(action.error)
        }
    };

    const onDeleteTemplateClicked = async (tet_id) => {
        const action = await dispatch(deleteTemplate(tet_id));
        if (action.meta.requestStatus === "rejected") {
            errorMessage(action.error)
        }
    };

    const onChangeSaveTemplate = useCallback(
        (e) => {
            const updateQuery = removeBeforeWhiteSpace(e.target.value)
            setInputTemplateName(updateQuery);
        },
        [inputTemplateName]
    );

    const onAddTemplateClicked = async () => {
        if (examinationData.length === 0) {
            errorMessage('At least 1 examination added')
        } else if (examinationData.filter(e => e.examination_name == "").length > 0) {
            errorMessage('Please fillup examination name')
        } else {
            var sendData = {
                tet_template_name: inputTemplateName,
                examination: examinationData,
            };
            const action = await dispatch(addTemplate(sendData));
            if (action.meta.requestStatus === "fulfilled") {
                setInputTemplateName(null);
                handleDrawerSave();
            }
        }
    };

    const onSearchTemplate = useCallback(() => {
        setInputTemplateName(null);
    }, [inputTemplateName]);

    const onSelectTemplate = useCallback(
        (data, e) => {
            setInputTemplateName(e.key);
        },
        [inputTemplateName]
    );

    const onUpdateTemplateClicked = async () => {
        if (examinationData.length === 0) {
            errorMessage('At least 1 examination added')
        } else if (examinationData.filter(e => e.examination_name == "").length > 0) {
            errorMessage('Please fillup examination name')
        } else {
            var data = JSON.parse(inputTemplateName);
            var sendData = {
                tet_id: data.tet_id,
                tet_template_name: data.tet_template_name,
                examination: examinationData,
            };
            const action = await dispatch(updateTemplate(sendData));
            if (action.meta.requestStatus === "fulfilled") {
                setInputTemplateName(null);
                handleDrawerSave();
            }
        }
    };

    const showHideModal = useCallback((template_id) => {
        template_id !== undefined ? setRemoveTemplateId(template_id) : setRemoveTemplateId(null)
        setIsModalOpen(!isModalOpen);
    }, [isModalOpen]);

    //Template Remove
    const DELETE_MODAL = useMemo(() => {
        return (
            <CommonModal
                isModalOpen={isModalOpen}
                onCancel={showHideModal}
                modalWidth={500}
                title={"You may lose your data"}
                modalBody={
                    <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                            <div className="d-flex align-items-center">
                                <img className='me-3' src={alertIcon} alt="Warning" />
                                <span>
                                    Are you sure you want to delete this template?
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="d-flex align-items-center mt-2 justify-content-end">
                                <div onClick={() => {
                                    onDeleteTemplateClicked(removeTemplateId)
                                    showHideModal()
                                }}
                                    className="me-4 text-decoration-underline btn p-0 text-main">
                                    Yes Delete
                                </div>
                                <Button onClick={showHideModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                                    <span>No</span>
                                </Button>
                            </div>
                        </div>
                    </>
                }
            />
        );
    }, [isModalOpen]);

    //Child Componet
    // const TABLE_EXAMINATION = useMemo(() => {
    //     return (
    //         examinationData.length > 0 &&
    //         examinationData.map((item, index) => {
    //             return (
    //                 <div key={index} style={{ width: item.examination_name.length > 12 && item.examination_name.length < 24 ? `${item.examination_name.length * 10.5}px` : item.examination_name.length >= 24 ? '256px' : '150px' }} className="d-flex align-items-center justify-content-between text-truncate closable-chips closable-chips-active">
    //                     <div className="text-truncate p-2" onClick={() => handleDrawerChild({ ...item, index: index })}>
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
    // }, [examinationData]);

    const SortableItem = SortableElement(({ item }) => (
        <div
            style={{
                width: item.examination_name.length > 12 && item.examination_name.length < 24
                    ? `${item.examination_name.length * 10.5}px`
                    : item.examination_name.length >= 24
                        ? '256px'
                        : '150px'
            }}
            className={"d-flex align-items-center justify-content-between text-truncate closable-chips closable-chips-active"}
        >
            <div className="text-truncate p-2" onClick={() => handleDrawerChild(item)}>
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
    }, [examinationData, childDrawerData]);

    //Template Componet
    const TEMPLATE_CONTENT = useMemo(() => {
        return (
            <>
                <div>
                    <div className="medicine-templates">
                        <Input className="popinput" placeholder="Search Templates" onChange={onSearch} prefix={<i className='icon-search me-2'></i>} allowClear />
                    </div>
                    <div className="tab-template-height" >
                        {matchedTemplates.length > 0 &&
                            matchedTemplates.map((template, i) => {
                                return (
                                    <div className="align-items-center d-flex justify-content-between medicine-templates" key={i}>
                                        <div className="align-items-center d-flex text-truncate w-100" onClick={() => onTemplateSelected(template)}>
                                            <div className="round-box"><i className="icon-template"></i></div>
                                            <div className="text-truncate w-100">
                                                <div className="title text-main2">{template.tet_template_name}</div>
                                                <div className="text-truncate">
                                                    <span>{template.examination}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button className="btn btn-delete-prescription p-0 ms-3" onClick={() => showHideModal(template.tet_id)}>
                                            {template.loading ? (
                                                <Spin
                                                    indicator={
                                                        <LoadingOutlined style={{ fontSize: 22 }} spin />
                                                    }
                                                />
                                            ) : (
                                                <i className="icon-delete"></i>
                                            )}
                                        </Button>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            </>
        );
    }, [templateDrawer, matchedTemplates]);

    //Save Componet
    const SAVE_CONTENT = useMemo(() => {
        return (
            <>
                <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
                    <Tabs
                        defaultActiveKey={TAB_ADD_TEMPLATE}
                        items={ADD_EDIT_TEMPLATE_TABS}
                        onChange={onTabChange}
                        className="w-100" />
                </div>
                {tabChange === TAB_ADD_TEMPLATE ? (
                    <div className="medicine-templates d-flex">
                        <Input
                            allowClear
                            value={inputTemplateName && inputTemplateName}
                            className="popinput inputheight41"
                            placeholder="Template Name"
                            onChange={onChangeSaveTemplate}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onAddTemplateClicked}
                        >
                            {" Save "}
                        </Button>
                    </div>
                ) : (
                    <div className="medicine-templates d-flex">
                        <Select
                            showSearch
                            value={inputTemplateName && JSON.parse(inputTemplateName).tet_template_name}
                            className="autocomplete-custom w-100 popinput inputheight41"
                            placeholder="Select Template"
                            onSearch={onSearchTemplate}
                            onSelect={onSelectTemplate}
                            optionLabelProp="label"
                            options={allTemplates.map((template) => {
                                return {
                                    key: JSON.stringify(template),
                                    value: template.tet_template_name,
                                    label: (
                                        <div key={template.tet_id}>
                                            {template.tet_template_name}
                                        </div>
                                    ),
                                };
                            })}
                            optionRender={(option) => (
                                <div className="align-items-center d-flex text-truncate w-100">
                                    <div className="round-box"><i className="icon-template"></i></div>
                                    <div className="text-truncate w-100">
                                        <div className="title text-main2">{option.data.value}</div>
                                        <div className="text-truncate">
                                            <span>{JSON.parse(option.data.key).examination}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onUpdateTemplateClicked}
                        >
                            {" Update "}
                        </Button>
                    </div>
                )}
            </>
        );
    }, [tabChange, saveDrawer, inputTemplateName, loading, allTemplates]);

    const onChangeInputNoteChild = useCallback(
        (e) => {
            setChildDrawerData({ ...childDrawerData, note: e.target.value })
            // ?.replace(/,/g, '')
        },
        [childDrawerData]
    );

    const updateChild = (item) => {
        const { index, ...updatedReqData } = item;
        examinationData[item.index] = { ...examinationData[item.index], ...updatedReqData };
        setExaminationData((prev) => [...prev]);
        handleDrawerChild();
        dispatch(setIsDDxReadyToGenerate(true));
    }

    //Child Componet
    const CHILD_DRAWER_DATA = useMemo(() => {
        return (
            childDrawerData && (
                <>
                    <Card bordered={false} className="search-modalCard">
                        <div className='modalCard-header align-items-center justify-content-between d-flex'>
                            <div className='align-items-center d-flex'>
                                <Button type="text" className='btn btn-delete-prescription px-3 focus-none h-100' onClick={handleDrawerChild}>
                                    <i className='icon-Cross fs-3'></i>
                                </Button>
                                <div className="modal-title text-truncate-twolines">{childDrawerData.examination_name}</div>
                            </div>
                            <Button className='btn btn-primary3 btn-41 px-4 me-20' onClick={() => updateChild(childDrawerData)}>
                                Done
                            </Button>
                        </div>
                    </Card>
                    <div className="p-4">
                        <label className="title-common">
                            Add Details
                        </label>
                        <Input.TextArea value={childDrawerData.note !== undefined && childDrawerData.note} placeholder="Enter any specific details here" className="textareaPlaceholder" rows={3} onChange={onChangeInputNoteChild} />
                    </div>
                </>
            )
        );
    }, [childDrawer, childDrawerData]);

    const showHideClearData = useCallback(() => {
        setIsModalOpen1(!isModalOpen1);
    }, [isModalOpen1]);

    const onRemoveRows = () => {
        setExaminationData([])
        showHideClearData()
    };

    //Remove All Rows
    const REMOVE_ALL_ROWS = useMemo(() => {
        return (
            <CommonModal
                isModalOpen={isModalOpen1}
                onCancel={showHideClearData}
                modalWidth={500}
                title={"You may lose your data"}
                modalBody={
                    <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                            <div className="d-flex align-items-center">
                                <img className='me-3' src={alertIcon} alt="Warning" />
                                <span>
                                    Are you sure you want to Clear Selected <b>Examinations</b>?
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="d-flex align-items-center mt-2 justify-content-end">
                                <div onClick={onRemoveRows}
                                    className="me-4 text-decoration-underline btn p-0 text-main">
                                    <span>Yes, Clear</span>
                                </div>
                                <Button onClick={showHideClearData} className="lh-lg btn btn-primary3 btn-41 px-4">
                                    <span>No</span>
                                </Button>
                            </div>
                        </div>
                    </>
                }
            />
        );
    }, [isModalOpen1]);

    return (
        <>
            <div>
                <div className="d-flex align-items-center justify-content-between p-14-pb0">
                    <div className="d-flex align-items-center">
                        <img className='me-2' src={Examinationicon} alt="Examination" />
                        <div className="title-common">Examinations</div>
                    </div>

                    <div className="d-flex align-items-center">
                        <button className='btn d-flex align-items-center btn-text' onClick={handleDrawerTemplate}> <i className="icon-template me-2"></i> <span>Templates</span></button>
                        <Tooltip placement="bottom" title={(examinationData.length > 0) ? "" : "Please enter some Examination to save a template"}>
                            <button className='btn d-flex align-items-center btn-text' onClick={() => (examinationData.length > 0) && handleDrawerSave()} > <i className="icon-save me-2"></i> <span>Save</span></button>
                        </Tooltip>
                        <button onClick={showHideClearData} className="btn btn-text clear-text d-flex align-items-center" disabled={examinationData.length > 0 ? false : true}>
                            <i className="icon-eraser1 me-2"></i> <span>Clear</span>
                        </button>
                    </div>
                    <Drawer title="Examination Templates" placement="right" onClose={handleDrawerTemplate} open={templateDrawer} className="modalWidth-563" width="auto">
                        {TEMPLATE_CONTENT}
                    </Drawer>

                    <Drawer title="Save Template" placement="right" onClose={handleDrawerSave} open={saveDrawer} className="modalWidth-563" width="auto">
                        {SAVE_CONTENT}
                    </Drawer>
                </div>
                <div className="d-flex flex-wrap p-14-pb0">
                    {TABLE_EXAMINATION}
                    <Drawer closeIcon={false} placement="right" onClose={handleDrawerChild} open={childDrawer} className="modalWidth-563" width="auto">
                        {CHILD_DRAWER_DATA}
                    </Drawer>
                </div>
                <div className="p-14 py-0">
                    <div className="inputheight38 border rounded-10px d-flex align-items-center" onClick={handleDrawerParent}>
                        <i className='icon-search mx-2'></i>
                        <span className="fontroboto backbar fw-normal"> Search Examinations</span>
                    </div>
                </div>
                <Drawer closeIcon={false} placement="right" onClose={handleDrawerParent} open={parentDrawer} width={'100%'} className="searchdrawer-content">
                    {parentDrawer && (<TabExaminationSearch passIndex={selectedIndex} onClose={handleDrawerParent} />)}
                </Drawer>
                <div className="d-flex flex-wrap p-14-pb0 overflow-hidden" style={{ maxHeight: '114px' }}>
                    {parentOptionsList.length > 0 &&
                        parentOptionsList.filter(e => ![...examinationData.map(e1 => e1.examination_name)].includes(e.examination_name)).map((item, i) => {
                            return (
                                <Button key={i} type="text" style={{ width: item.examination_name.length > 26 && '250px' }} className={`${item.examination_name.length > 26 && 'chips-custom-break'} btn btn-primary2 chips-custom mb-14 me-14`} onClick={() => onSelectParent({ ...item, unique_id: uuidv4() })}>{`${item.examination_name}`}</Button>
                            )
                        })}
                </div>
                {DELETE_MODAL}
                {REMOVE_ALL_ROWS}
            </div>
        </>
    );
}

export default React.memo(TabExaminationBox);
