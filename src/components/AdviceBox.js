import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import {
  AutoComplete,
  Input,
  Button,
  Row,
  Select,
  Popover,
  Tabs,
  Spin,
  Checkbox,
  Drawer,
  Card,
  Col,
  Tooltip
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';

import CommonModal from '../common/CommonModal';

import CashManagerContext from '../context/CashManagerContext';
import { errorMessage, removeBeforeWhiteSpace, capitalizeAfterSentence } from "../utils/utils";

import { MenuOutlined } from '@ant-design/icons';
import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getAdviceTemplates,
  getFrequentlySearchedAdvice,
  searchAdvice
} from "../redux/adviceSlice";

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { classNames } from "@react-pdf-viewer/core";
import { ASSETS } from "../assets";
import {
  VOICE_MODULE_DUMMY_DIGITISED_DATA,
  moduleRowsToPreviousContext,
  VoiceRxModuleActionButton,
  VoiceRxModuleButton,
  VoiceRxModuleCapture,
  useVoiceRxModuleCapture,
} from "./dr-agent/voicerx/VoiceRxModuleCapture";
import { Grid5, Trash } from "iconsax-reactjs";
import voiceModuleStyles from "./dr-agent/voicerx/VoiceRxModuleCapture.module.scss";
const {
  alerticon: alertIcon,
  advice: Adviceicon,
} = ASSETS.images;

function AdviceBox({ showVoiceRxModule }) {
  const isVoiceRxModuleEnabled = Boolean(showVoiceRxModule);
  const inputRef = useRef();
  const {
    selectedAdviceList,
    parentOptionsList,
    childOptionsList,
    templates,
    loading,
  } = useSelector((state) => state.advice);
  const dispatch = useDispatch();

  const { adviceData, setAdviceData } = useContext(CashManagerContext);
  // const [adviceData, setAdviceData] = useState([]);
  const [adviceDataCheck, setAdviceDataCheck] = useState([]);
  const applyVoiceAdvice = useCallback((nextAdvice) => {
    if (nextAdvice.length > 0) {
      setAdviceData(nextAdvice);
    }
  }, [setAdviceData]);
  const adviceVoicePreviousContext = useMemo(
    () => moduleRowsToPreviousContext(adviceData, "advice"),
    [adviceData]
  );
  const {
    voiceCaptureOpen,
    setVoiceCaptureOpen,
    voiceUpdated,
    handleVoiceCaptureComplete,
    sectionRef,
  } = useVoiceRxModuleCapture({
    moduleName: "Advices",
    onApply: applyVoiceAdvice,
    successMessage: "Advices filled from voice dictation",
    copyPayloadKeys: ["advice"],
  });

  //PopOver1
  const [popOver1, setPopOver1] = useState(false);
  const [allTemplates, setAllTemplates] = useState([]);
  const [matchedTemplates, setMatchedTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [removeTemplateId, setRemoveTemplateId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [parentSearchOptions, setParentSearchOptions] = useState([]);

  const [autoCompleteFlag, setAutoCompleteFlag] = useState(false);
  const [childDrawer, setChildDrawer] = useState(false);
  const [childDrawerData, setChildDrawerData] = useState(null);

  //PopOver2
  const [popOver2, setPopOver2] = useState(false);
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
  }, []);

  useEffect(() => {
    setMatchedTemplates(templates);
    setAllTemplates(templates);
  }, [templates]);

  //Parent AutoComplete
  useEffect(() => {
    if (searchQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchAdvice({ searchQuery: searchQuery, type: "parent" })
        );
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      dispatch(getFrequentlySearchedAdvice());
    }
  }, [searchQuery]);

  useEffect(() => {
    const data = [];
    parentOptionsList.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e, unique_id: uuidv4() }),
        value: e.advice_name,
        label: <><Checkbox className="advice-check" checked={adviceDataCheck.some(x => x.advice_name == e.advice_name)}></Checkbox>{e.advice_name}</>,
      });
    });

    data.unshift({
      key: -1,
      label: (
        <div className="d-flex justify-content-between align-items-center">
          <div>{searchQuery ? 'Search Results' : 'FREQUENTLY USED'}</div>
          <Button
            className="btn btn-primary3 ms-3" onClick={onClickParent} disabled={adviceDataCheck.length > 0 ? false : true}>
            {`Done (${adviceDataCheck.length})`}
          </Button>
        </div>
      ),
    });

    searchQuery && parentOptionsList.findIndex(e => e.advice_name?.toLowerCase()?.trim() == searchQuery?.toLowerCase()?.trim()) === -1 &&
      data.push({
        key: JSON.stringify({
          unique_id: uuidv4(),
          change: 1,
          pms_default: 0,
          advice_name: searchQuery
        }),
        value: searchQuery,
        label: <div className='d-flex align-items-center'>
          <Checkbox checked={adviceDataCheck.some(x => x.advice_name == searchQuery)}></Checkbox>
          <div className="ms-2">{searchQuery} <i className="icon-Add mx-1 text-primary fs-6"></i> <a className="fw-medium text-decoration-underline text-primary"> Add Custom</a></div>
        </div>,
      });
    setParentSearchOptions(data);
  }, [parentOptionsList, adviceDataCheck]);

  const onFocusParent = useCallback(
    () => {
      setAutoCompleteFlag(true);
    },
    [autoCompleteFlag]
  );
  const onBlurParent = useCallback(
    () => {
      setAutoCompleteFlag(false);
      onClickParent()
    },
    [autoCompleteFlag, adviceDataCheck]
  );

  const onSearchParent = useCallback(
    (query) => {
      setSearchQuery(removeBeforeWhiteSpace(query));
      // ?.replace(/,/g, '')
    },
    [searchQuery]
  );

  const onSelectParent = useCallback(
    (data, e) => {
      setAdviceDataCheck((previousState) => {
        const index = previousState.findIndex((x) => x.advice_name == JSON.parse(e.key).advice_name)
        console.log(index)
        if (index !== -1) {
          const cloned = [...previousState]
          cloned.splice(index, 1)
          return cloned
        } else {
          return [...previousState, JSON.parse(e.key)]
        }
      })
      // if (adviceDataCheck.some(el => el.advice_name == JSON.parse(e.key).advice_name)) {
      //   console.log('Some')
      //   const index = adviceDataCheck.findIndex(el => el.advice_name == JSON.parse(e.key).advice_name)
      //   if (index !== -1)
      //     adviceDataCheck.splice(index, 1)
      // } else {
      //   console.log('With')
      //   adviceDataCheck.push({
      //     ...JSON.parse(e.key),
      //   })
      // }
      // setAdviceDataCheck(prev => [...prev])
    },
    [adviceDataCheck]
  );

  function onClickParent() {
    const data = [...adviceData, ...adviceDataCheck]
    setAdviceData(data);
    setAdviceDataCheck([])
    setSearchQuery("");
    setAutoCompleteFlag(false);
    inputRef.current.blur()
  }

  const onRemoveRow = (index) => {
    adviceData.splice(index, 1);
    setAdviceData((prev) => [...prev]);
  };

  //PopOver1 function
  const showHideTemplatesListPopover = useCallback(() => {
    setPopOver1(!popOver1);
  }, [popOver1]);

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
    showHideTemplatesListPopover();
  };

  const onDeleteTemplateClicked = async (tat_id) => {
    const action = await dispatch(deleteTemplate(tat_id));
    if (action.meta.requestStatus === "rejected") {
      errorMessage(action.error)
    }
  };

  //PopOver2 function
  const showHideSaveTemplatePopOver = useCallback(() => {
    setInputTemplateName(null);
    setPopOver2(!popOver2);
  }, [popOver2]);

  const onTabChange = useCallback(
    (key) => {
      setInputTemplateName(null);
      setTabChange(key);
    },
    [tabChange]
  );

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
        showHideSaveTemplatePopOver();
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
        showHideSaveTemplatePopOver();
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
  //   return (
  //     adviceData.length > 0 &&
  //     adviceData.map((item, index) => {
  //       return (
  //         <Row
  //           key={index}
  //           gutter={[0]}
  //           className='px-3 advicecheck-row justify-content-between align-items-center'>
  //           <Checkbox checked onClick={() => onRemoveRow(index)}><div className="text-truncate-twolines">{item.advice_name}</div></Checkbox>
  //           <Button className="btn btn-delete-prescription p-0" onClick={() => handleDrawerChild({ ...item, index: index })}><i className="icon-Edit text-main"></i></Button>
  //         </Row>
  //       );
  //     })
  //   );
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
                        className="advicecheck-row align-items-center"
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

  // Handle Child Drawer
  const handleDrawerChild = useCallback((item) => {
    setChildDrawer(!childDrawer);
    setChildDrawerData(item)
  }, [childDrawer, childDrawerData]);

  //Template Componet
  const TEMPLATE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="pop-header" key="advice-template">
          <div className="align-items-center d-flex justify-content-between">
            <div className="title-common">Advice Templates</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={showHideTemplatesListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          <div className="mt-3" key="advice-template-search">
            <Input
              className="popinput"
              onChange={onSearch}
              placeholder="Search Templates"
              allowClear
              prefix={<i className="icon-search me-2" />}
            />
          </div>
        </div>
        <div className="pop-body">
          {matchedTemplates.length > 0 &&
            matchedTemplates.map((template, i) => {
              return (
                <div
                  className="align-items-center d-flex medicine-templates"
                  key={i}
                >
                  <div
                    className="round-box"
                    onClick={() => onTemplateSelected(template)}
                  >
                    {isVoiceRxModuleEnabled ? <Grid5 color="#4C4E5C" size={18} strokeWidth={1.6} variant="Linear" /> : <i className="icon-template"></i>}
                  </div>
                  <div
                    className="text-truncate w-100"
                    onClick={() => onTemplateSelected(template)}
                  >
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
                  <Button
                    className="btn btn-delete-prescription p-0 ms-2"
                    onClick={() => {
                      showHideModal(template.tat_id)
                      showHideTemplatesListPopover()
                    }}
                  >
                    {template.loading ? (
                      <Spin
                        indicator={
                          <LoadingOutlined style={{ fontSize: 22 }} spin />
                        }
                      />
                    ) : (
                      isVoiceRxModuleEnabled ? <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" /> : <i className="icon-delete"></i>
                    )}
                  </Button>
                </div>
              );
            })}
        </div>
      </>
    );
  }, [popOver1, matchedTemplates]);

  //Save Componet
  const SAVE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
          <Tabs
            defaultActiveKey={TAB_ADD_TEMPLATE}
            items={ADD_EDIT_TEMPLATE_TABS}
            onChange={onTabChange}
            className="w-100"
          />
          <Button
            className="btn btn-delete-prescription"
            onClick={showHideSaveTemplatePopOver}
          >
            <i className="icon-Cross"></i>
          </Button>
        </div>
        {tabChange === TAB_ADD_TEMPLATE ? (
          <div className="pop-header d-flex">
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
          <div className="pop-header d-flex">
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
                  <div className="round-box">{isVoiceRxModuleEnabled ? <Grid5 color="#4C4E5C" size={18} strokeWidth={1.6} variant="Linear" /> : <i className="icon-template"></i>}</div>
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
  }, [tabChange, popOver2, inputTemplateName, loading, allTemplates]);

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
      <div ref={sectionRef} data-voice-rx-dictation-target="advice" className={[voiceModuleStyles.moduleRoot, isVoiceRxModuleEnabled && voiceUpdated ? voiceModuleStyles.moduleUpdated : ""].filter(Boolean).join(" ")}>
        <div className="d-flex align-items-center justify-content-between p-14-pb0">
          <div className="d-flex align-items-center">
            <img className="me-2" src={Adviceicon} alt="Advice" />
            <div className="title-common">Advices</div>
          </div>
          <div className="d-flex align-items-center">
            {isVoiceRxModuleEnabled && (
              <VoiceRxModuleButton
                active={voiceCaptureOpen}
                dictationTargetId="advice"
                label="Start Advices voice input"
                onClick={() => setVoiceCaptureOpen(true)} />
            )}
            <Popover
              open={popOver1}
              onOpenChange={showHideTemplatesListPopover}
              content={TEMPLATE_CONTENT}
              trigger="click"
              overlayClassName="pop-350 pp-0"
              placement="bottom"
            >
              {isVoiceRxModuleEnabled ? (
                <span>
                  <Tooltip placement="bottom" title="Browse advice templates">
                    <VoiceRxModuleActionButton type="template" label="Browse advice templates" />
                  </Tooltip>
                </span>
              ) : (
                <button className="btn d-flex align-items-center btn-text">
                  {" "}
                  <i className="icon-template me-2"></i> <span>Templates</span>
                </button>
              )}
            </Popover>
            <Tooltip placement="bottom" title={(adviceData.length > 0) ? "" : "Please enter some Advices to save a template"}>
              <Popover
                open={popOver2}
                onOpenChange={() => (adviceData.length > 0) && showHideSaveTemplatePopOver()}
                // onOpenChange={showHideSaveTemplatePopOver}
                content={SAVE_CONTENT}
                trigger="click"
                overlayClassName="pop-450 pp-0"
                placement="bottom"
              >
                {isVoiceRxModuleEnabled ? (
                  <span>
                    <VoiceRxModuleActionButton type="save" label="Save advice as template" disabled={adviceData.length === 0} />
                  </span>
                ) : (
                  <button className="btn d-flex align-items-center btn-text">
                    {" "}
                    <i className="icon-save me-2"></i> <span>Save</span>
                  </button>
                )}
              </Popover>
            </Tooltip>
            {isVoiceRxModuleEnabled ? (
              <Tooltip placement="bottom" title="Clear this section">
                <VoiceRxModuleActionButton type="clear" label="Clear advice" onClick={showHideClearData} disabled={adviceData.length === 0} />
              </Tooltip>
            ) : (
              <button onClick={showHideClearData} className="btn btn-text clear-text d-flex align-items-center" disabled={adviceData.length > 0 ? false : true}>
                <i className="icon-eraser1 me-2"></i> <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {DELETE_MODAL}
        {REMOVE_ALL_ROWS}
        {TABLE_ADVICE}
        <Drawer closeIcon={false} placement="right" onClose={handleDrawerChild} open={childDrawer} className="modalWidth-563" width="auto">
          {CHILD_DRAWER_DATA}
        </Drawer>

        <div className={isVoiceRxModuleEnabled && voiceCaptureOpen ? voiceModuleStyles.moduleSlot : "p-14"}>
          {isVoiceRxModuleEnabled && voiceCaptureOpen ? (
            <VoiceRxModuleCapture
              moduleName="Advices"
              previousContext={adviceVoicePreviousContext}
              dummyDigitisedData={VOICE_MODULE_DUMMY_DIGITISED_DATA.advice}
              onCancel={() => setVoiceCaptureOpen(false)}
              onComplete={handleVoiceCaptureComplete} />
          ) : (
            <AutoComplete
              ref={inputRef}
              // defaultValue={searchParentQuery}
              value={searchQuery}
              onSearch={onSearchParent}
              onFocus={onFocusParent}
              onBlur={onBlurParent}
              options={parentSearchOptions}
              className="autocomplete-custom w-100"
              open={autoCompleteFlag}
              onSelect={onSelectParent}
              popupClassName="boxpopup"
            >
              <Input
                placeholder="Search Advices"
                prefix={<i className="icon-search"></i>}
              />
            </AutoComplete>
          )}
        </div>
      </div>
    </>
  );
}

export default React.memo(AdviceBox);
