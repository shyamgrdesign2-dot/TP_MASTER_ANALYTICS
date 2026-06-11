import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { Input, Button, Drawer, Tabs, Select, Card, Spin, Checkbox, Tooltip, Row, Col } from 'antd';

import { LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';

import CommonModal from '../../common/CommonModal';

import CashManagerContext from '../../context/CashManagerContext';
import { errorMessage, removeBeforeWhiteSpace, capitalizeAfterSentence } from "../../utils/utils";

import { MenuOutlined } from '@ant-design/icons';
import {
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getAdviceTemplates,
    getFrequentlySearchedAdvice,
} from "../../redux/adviceSlice";

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import TabAdviceSearch from "../../components/tab_design/TabAdviceSearch";
import { ASSETS } from "../../assets";
const {
  alerticon: alertIcon,
  advice: Adviceicon,
} = ASSETS.images;

function TabAdviceBox() {

    const {
        selectedAdviceList,
        parentOptionsList,
        templates,
        loading,
    } = useSelector((state) => state.advice);
    const dispatch = useDispatch();

    const { adviceData, setAdviceData } = useContext(CashManagerContext);
    // const [ adviceData, setAdviceData] = useState([]);

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

    useEffect(() => {
        if (selectedAdviceList.length > 0) {
            const updatedData = adviceData.map((e, i) => {
                return { ...e, ...selectedAdviceList[i] };
            });
            setAdviceData(updatedData);
        }
    }, [selectedAdviceList]);

    useEffect(() => {
        dispatch(getAdviceTemplates());
        dispatch(getFrequentlySearchedAdvice());
    }, []);

    useEffect(() => {
        setMatchedTemplates(templates);
        setAllTemplates(templates);
    }, [templates]);

    const onRemoveRow = (index) => {
        adviceData.splice(index, 1);
        setAdviceData((prev) => [...prev]);
    };

    // Handle Parent Drawer
    const handleDrawerParent = useCallback(() => {
        setParentDrawer(!parentDrawer);
    }, [parentDrawer]);

    const onSelectParent = useCallback(
        (e) => {
            adviceData.push({
                ...e,
            });
            setAdviceData((prev) => [...prev]);
        },
        [adviceData]
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
                return template.tat_template_name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());
            });
            setMatchedTemplates(filteredTemplates);
        } else {
            setMatchedTemplates(templates);
        }
    };

    const onTemplateSelected = (template) => {
        const updatedData = template.advices.map(e => {
            return { ...e, unique_id: uuidv4() }
        })
        setAdviceData([...adviceData, ...updatedData]);
        handleDrawerTemplate();
    };

    const onDeleteTemplateClicked = async (tat_id) => {
        const action = await dispatch(deleteTemplate(tat_id));
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
        if (adviceData.length === 0) {
            errorMessage('At least 1 advice added')
        } else if (adviceData.filter(e => e.advice_name == "").length > 0) {
            errorMessage('Please fillup advice name')
        } else {
            var sendData = {
                tat_template_name: inputTemplateName,
                advices: adviceData,
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
        if (adviceData.length === 0) {
            errorMessage('At least 1 advice added')
        } else if (adviceData.filter(e => e.advice_name == "").length > 0) {
            errorMessage('Please fillup advice name')
        } else {
            var data = JSON.parse(inputTemplateName);
            var sendData = {
                tat_id: data.tat_id,
                tat_template_name: data.tat_template_name,
                advices: adviceData,
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
    // const TABLE_ADVICE = useMemo(() => {
    //     return (
    //         adviceData.length > 0 &&
    //         adviceData.map((item, index) => {
    //             return (
    //                 <div className="d-flex align-items-center justify-content-between border-bottom py-1">
    //                     <Checkbox checked onClick={() => onRemoveRow(index)}><div className="text-truncate-twolines">{item.advice_name}</div></Checkbox>
    //                     <Button className="focus-none btn px-1 btn-delete-prescription" onClick={() => handleDrawerChild({ ...item, index: index })}><i className="icon-Edit text-main fs-21"></i></Button>
    //                 </div>
    //             );
    //         })
    //     );
    // }, [adviceData]);

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
                              {item?.pms_default === 0 && <Button className="btn btn-delete-prescription p-0" onClick={() => handleDrawerChild({ ...item, index: index })}><i className="icon-Edit text-main"></i></Button>}
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
      }, [adviceData]);

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
                                                <div className="title text-main2">{template.tat_template_name}</div>
                                                <div className="text-truncate">
                                                    {template.advices.map((item, ii) => {
                                                        return (
                                                            <span key={ii}>{`${item.advice_name}${template.advices.length - 1 != ii ? ", " : ""
                                                                }`}</span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <Button className="btn btn-delete-prescription p-0 ms-3" onClick={() => showHideModal(template.tat_id)}>
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
                            value={inputTemplateName && JSON.parse(inputTemplateName).tat_template_name}
                            className="autocomplete-custom w-100 popinput inputheight41"
                            placeholder="Select Template"
                            onSearch={onSearchTemplate}
                            onSelect={onSelectTemplate}
                            optionLabelProp="label"
                            options={allTemplates.map((template) => {
                                return {
                                    key: JSON.stringify(template),
                                    value: template.tat_template_name,
                                    label: (
                                        <div key={template.tat_id}>
                                            {template.tat_template_name}
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
                                            {JSON.parse(option.data.key).advices.map((item, ii) => {
                                                return (
                                                    <span key={ii}>{`${item.advice_name}${JSON.parse(option.data.key).advices.length - 1 != ii ? ", " : ""
                                                        }`}</span>
                                                );
                                            })}
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
        handleDrawerChild()
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
                                <div className="modal-title text-truncate-twolines">{'Edit Advice'}</div>
                            </div>
                            <Button className='btn btn-primary3 btn-41 px-4 me-20' onClick={() => updateChild(childDrawerData)} disabled={childDrawerData.advice_name !== undefined && childDrawerData.advice_name ? false : true}>
                                Done
                            </Button>
                        </div>
                    </Card>
                    <div className="p-4">
                        <Input.TextArea value={childDrawerData.advice_name !== undefined && childDrawerData.advice_name} placeholder="Enter any specific details here" className="textareaPlaceholder" rows={3} onChange={onChangeInputNoteChild} />
                    </div>
                </>
            )
        );
    }, [childDrawer, childDrawerData]);

    const showHideClearData = useCallback(() => {
        setIsModalOpen1(!isModalOpen1);
    }, [isModalOpen1]);

    const onRemoveRows = () => {
        setAdviceData([])
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
                                    Are you sure you want to Clear Selected <b>Advices</b>?
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
                        <img className='me-2' src={Adviceicon} alt="Advice" />
                        <div className="title-common">Advices</div>
                    </div>

                    <div className="d-flex align-items-center">
                        <button className='btn d-flex align-items-center btn-text' onClick={handleDrawerTemplate}> <i className="icon-template me-2"></i> <span>Templates</span></button>
                        <Tooltip placement="bottom" title={(adviceData.length > 0) ? "" : "Please enter some Advices to save a template"}>
                            <button className='btn d-flex align-items-center btn-text' onClick={() => (adviceData.length > 0) && handleDrawerSave()} > <i className="icon-save me-2"></i> <span>Save</span></button>
                        </Tooltip>
                        <button onClick={showHideClearData} className="btn btn-text clear-text d-flex align-items-center" disabled={adviceData.length > 0 ? false : true}>
                            <i className="icon-eraser1 me-2"></i> <span>Clear</span>
                        </button>
                    </div>
                    <Drawer title="Advice Templates" placement="right" onClose={handleDrawerTemplate} open={templateDrawer} className="modalWidth-563" width="auto">
                        {TEMPLATE_CONTENT}
                    </Drawer>

                    <Drawer title="Save Template" placement="right" onClose={handleDrawerSave} open={saveDrawer} className="modalWidth-563" width="auto">
                        {SAVE_CONTENT}
                    </Drawer>
                </div>
                <div className={adviceData.length > 0 ? "p-14" : "p-14-pb0"}>
                    <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
                        {TABLE_ADVICE}
                    </div>
                    <Drawer closeIcon={false} placement="right" onClose={handleDrawerChild} open={childDrawer} className="modalWidth-563" width="auto">
                        {CHILD_DRAWER_DATA}
                    </Drawer>
                </div>
                <div className="p-14 py-0">
                    <div className="inputheight38 border rounded-10px d-flex align-items-center" onClick={handleDrawerParent}>
                        <i className='icon-search mx-2'></i>
                        <span className="fontroboto backbar fw-normal">Search Advices</span>
                    </div>
                </div>
                <Drawer closeIcon={false} placement="right" onClose={handleDrawerParent} open={parentDrawer} width={'100%'} className="searchdrawer-content">
                    {parentDrawer && (<TabAdviceSearch onClose={handleDrawerParent} />)}
                </Drawer>
                <div className="d-flex flex-wrap p-14-pb0 overflow-hidden" style={{ maxHeight: '114px' }}>
                    {parentOptionsList.length > 0 &&
                        parentOptionsList.filter(e => ![...adviceData.map(e1 => e1.advice_name)].includes(e.advice_name)).map((item, i) => {
                            return (
                                <Button key={i} type="text" style={{ width: item.advice_name.length > 26 && '250px' }} className={`${item.advice_name.length > 26 && 'chips-custom-break'} btn btn-primary2 chips-custom mb-14 me-14`} onClick={() => onSelectParent({ ...item, unique_id: uuidv4() })}>{`${item.advice_name}`}</Button>
                            )
                        })}
                </div>
                {DELETE_MODAL}
                {REMOVE_ALL_ROWS}
            </div>
        </>
    );
}

export default React.memo(TabAdviceBox);
