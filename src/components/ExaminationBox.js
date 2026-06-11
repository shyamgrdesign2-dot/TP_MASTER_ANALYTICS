import React, { useState, useEffect, useCallback, useMemo, useContext } from "react";
import {
  AutoComplete,
  Input,
  Button,
  Row,
  Col,
  Select,
  Popover,
  Tabs,
  Spin,
  Tooltip
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';

import CommonModal from '../common/CommonModal';

import CashManagerContext from '../context/CashManagerContext';
import { errorMessage, onlyNumberFormat, removeBeforeWhiteSpace, capitalizeAfterSentence } from "../utils/utils";
import { appendStripped, stripEmptyRows } from "../utils/voiceRxRowStrip";

import { MenuOutlined, PlusOutlined } from '@ant-design/icons';
import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getExaminationTemplates,
  getFrequentlySearchedExamination,
  searchExamination,
  singleTemplateDetails
} from "../redux/examinationSlice";

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { setIsDDxReadyToGenerate } from "../redux/ddxSlice";
import { ASSETS } from "../assets";
import { Grid5, Trash } from "iconsax-reactjs";
import {
  VOICE_MODULE_DUMMY_DIGITISED_DATA,
  moduleRowsToPreviousContext,
  VoiceRxModuleButton,
  VoiceRxModuleActionButton,
  VoiceRxModuleCapture,
  useVoiceRxModuleCapture,
} from "./dr-agent/voicerx/VoiceRxModuleCapture";
import voiceModuleStyles from "./dr-agent/voicerx/VoiceRxModuleCapture.module.scss";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_VOICE_RX_NEW_UI } from "../utils/constants";
const {
  alerticon: alertIcon,
  examination: Examinationicon,
} = ASSETS.images;

function ExaminationBox({ showVoiceRxModule }) {
  const isVoiceRxModuleEnabled = Boolean(showVoiceRxModule);
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const canShowVoiceRxNewRows = isVoiceRxModuleEnabled && isVoiceRxNewFromGB;
  const {
    selectedExaminationList,
    parentOptionsList,
    childOptionsList,
    templates,
    loading,
  } = useSelector((state) => state.examination);
  const dispatch = useDispatch();

  const { examinationData, setExaminationData, symptomsData } = useContext(CashManagerContext);
  // const [ examinationData, setExaminationData] = useState([]);

  //PopOver1
  const [popOver1, setPopOver1] = useState(false);
  const [allTemplates, setAllTemplates] = useState([]);
  const [matchedTemplates, setMatchedTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [removeTemplateId, setRemoveTemplateId] = useState(null);

  const [searchParentQuery, setSearchParentQuery] = useState("");
  const [parentSearchOptions, setParentSearchOptions] = useState([]);

  const [searchChildQuery, setSearchChildQuery] = useState(null);
  const [childSearchOptions, setChildSearchOptions] = useState([]);

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
  const emptyExaminationRow = () => ({ examination_name: "", unique_id: uuidv4(), note: "", change: 1, pms_default: 0 });

  const applyVoiceExaminations = useCallback((nextExaminations) => {
    if (nextExaminations.length > 0) {
      if (canShowVoiceRxNewRows) {
        const last = nextExaminations[nextExaminations.length - 1];
        const withTrailing = (!last || last.examination_name !== "") ? [...nextExaminations, emptyExaminationRow()] : nextExaminations;
        setExaminationData(withTrailing);
      } else {
        setExaminationData(nextExaminations);
      }
    }
  }, [canShowVoiceRxNewRows, setExaminationData]); // eslint-disable-line react-hooks/exhaustive-deps

  // add one trailing empty row on mount (only when flag is on)
  useEffect(() => {
    if (!canShowVoiceRxNewRows) return;
    setExaminationData(prev => {
      const last = prev[prev.length - 1];
      if (!last || last.examination_name !== "") {
        return [...prev, emptyExaminationRow()];
      }
      return prev;
    });
  }, [canShowVoiceRxNewRows]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddRow = useCallback(() => {
    setExaminationData(prev => [...prev, emptyExaminationRow()]);
  }, [setExaminationData]);
  const examinationsVoicePreviousContext = useMemo(
    () => moduleRowsToPreviousContext(examinationData, "examinations"),
    [examinationData]
  );
  const {
    voiceCaptureOpen,
    setVoiceCaptureOpen,
    voiceUpdated,
    handleVoiceCaptureComplete,
    sectionRef,
  } = useVoiceRxModuleCapture({
    moduleName: "Examinations",
    onApply: applyVoiceExaminations,
    successMessage: "Examinations filled from voice dictation",
    copyPayloadKeys: ["examinations"],
  });

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
  }, []);

  useEffect(() => {
    setMatchedTemplates(templates);
    setAllTemplates(templates);
  }, [templates]);

  //Parent AutoComplete
  useEffect(() => {
    if (searchParentQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchExamination({ searchQuery: searchParentQuery, type: "parent" })
        );
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      dispatch(getFrequentlySearchedExamination());
    }
  }, [searchParentQuery]);

  useEffect(() => {
    const data = [];
    parentOptionsList.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e, unique_id: uuidv4() }),
        value: e.examination_name,
        label: <div>{e.examination_name}</div>,
      });
    });
    if (searchParentQuery.length === 0) {
      data.unshift({
        key: -1,
        label: (
          <>
            <div>FREQUENTLY USED</div>
          </>
        ),
      });
    } else {
      searchParentQuery && parentOptionsList.findIndex(e => e.examination_name?.toLowerCase()?.trim() == searchParentQuery?.toLowerCase()?.trim()) === -1 &&
        data.push({
          key: JSON.stringify({
            unique_id: uuidv4(),
            change: 1,
            pms_default: 0,
            examination_name: searchParentQuery
          }),
          value: searchParentQuery,
          label: (
            <>
              <div>{searchParentQuery}<i className="icon-Add mx-1 text-primary fs-6"></i> <a className="fw-medium text-decoration-underline text-primary"> Add Custom</a></div>
            </>
          ),
        });
    }
    setParentSearchOptions(data);
  }, [parentOptionsList]);

  const onSearchParent = useCallback(
    (query) => {
      setSearchParentQuery(removeBeforeWhiteSpace(query));
      // ?.replace(/,/g, '')
    },
    [searchParentQuery]
  );

  const onSelectParent = useCallback(
    (data, e) => {
      examinationData.push({
        ...JSON.parse(e.key),
        note: "",
      });
      setExaminationData((prev) => [...prev]);
      setSearchParentQuery("");
      dispatch(setIsDDxReadyToGenerate(true));
    },
    [searchParentQuery, examinationData]
  );

  //Child AutoComplete
  useEffect(() => {
    if (searchChildQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchExamination({
            searchQuery: searchChildQuery.query,
            type: "child",
          })
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
        value: e.examination_name,
        label: <div>{e.examination_name}</div>,
      });
    });
    if (searchChildQuery?.query && childOptionsList.findIndex(e => e.examination_name?.toLowerCase()?.trim() == searchChildQuery?.query?.toLowerCase()?.trim()) === -1) {
      data.push({
        key: JSON.stringify({
          ...examinationData[searchChildQuery.index],
          unique_id: uuidv4(),
          change: 1,
          pms_default: 0,
          examination_name: searchChildQuery.query
        }),
        value: searchChildQuery.query,
        label: (
          <>
            <div>{searchChildQuery.query}</div>
          </>
        ),
      });
    }
    setChildSearchOptions(data);
  }, [childOptionsList]);

  const onFocusChid = (i) => {
    setSearchChildQuery({ query: examinationData[i].examination_name, index: i });
    dispatch(
      searchExamination({ searchQuery: examinationData[i].examination_name, type: "child" })
    );
  };

  const onSearchChild = useCallback(
    (query, i) => {
      const updateQuery = removeBeforeWhiteSpace(query)
      // ?.replace(/,/g, '')
      examinationData[i] = {
        ...examinationData[i],
        change: 1,
        examination_name: updateQuery
      };
      setExaminationData((prev) => [...prev]);
      setSearchChildQuery({ query: updateQuery, index: i });
    },
    [searchChildQuery, examinationData]
  );

  const onSelectChild = useCallback(
    (data, e, i) => {
      examinationData[i] = { ...examinationData[i], ...JSON.parse(e.key) };
      setExaminationData((prev) => [...prev]);
      setSearchChildQuery({ query: JSON.parse(e.key).examination_name, index: i });
      dispatch(setIsDDxReadyToGenerate(true));
      if (canShowVoiceRxNewRows && i === examinationData.length - 1) {
        setExaminationData((prev) => [...prev, emptyExaminationRow()]);
      }
    },
    [searchChildQuery, examinationData, canShowVoiceRxNewRows]
  );

  const onChangeNoteChild = useCallback(
    (e, i) => {
      examinationData[i].note = e.target.value;
      // ?.replace(/,/g, '')
      setExaminationData((prev) => [...prev]);
      dispatch(setIsDDxReadyToGenerate(true));
    },
    [examinationData]
  );

  const onRemoveRow = (index) => {
    examinationData.splice(index, 1);
    if (canShowVoiceRxNewRows && examinationData.length === 0) {
      setExaminationData([emptyExaminationRow()]);
    } else {
      setExaminationData((prev) => [...prev]);
    }
    if (examinationData?.length > 0) {
      dispatch(setIsDDxReadyToGenerate(true));
    } else if (symptomsData?.length === 0) {
      dispatch(setIsDDxReadyToGenerate(false));
    }
  };

  //PopOver1 function
  const showHideTemplatesListPopover = useCallback(() => {
    setPopOver1(!popOver1);
  }, [popOver1]);

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
      setExaminationData(appendStripped(examinationData, updatedData, "examinations"));
      showHideTemplatesListPopover();
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
    const templateExamination = canShowVoiceRxNewRows ? stripEmptyRows(examinationData, "examinations") : examinationData;
    if (templateExamination.length === 0) {
      errorMessage('At least 1 examination added')
    } else if (templateExamination.filter(e => String(e.examination_name ?? "").trim() === "").length > 0) {
      errorMessage('Please fillup examination name')
    } else {
      var sendData = {
        tet_template_name: inputTemplateName,
        examination: templateExamination,
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
    const templateExamination = canShowVoiceRxNewRows ? stripEmptyRows(examinationData, "examinations") : examinationData;
    if (templateExamination.length === 0) {
      errorMessage('At least 1 examination added')
    } else if (templateExamination.filter(e => String(e.examination_name ?? "").trim() === "").length > 0) {
      errorMessage('Please fillup examination name')
    } else {
      var data = JSON.parse(inputTemplateName);
      var sendData = {
        tet_id: data.tet_id,
        tet_template_name: data.tet_template_name,
        examination: templateExamination,
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

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedItems = reorder(
      examinationData,
      result.source.index,
      result.destination.index
    );
    setExaminationData(reorderedItems);
  };

  const TABLE_EXAMINATION = useMemo(() => {
    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="examination" direction="vertical">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {examinationData.length > 0 &&
                examinationData.map((item, index) => (
                  <Draggable key={index} draggableId={`examination-${index}`} index={index}>
                    {(provided) => (
                      <Row
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        key={index}
                        gutter={[0]}
                        className={`${index === 0 && 'mt-14 border-top'
                          } align-items-center border-bottom`}
                      >
                        <Col lg={1} md={1} sm={1} xs={1} className="text-center">
                          <MenuOutlined
                            {...provided.dragHandleProps}
                            className="drag-handle"
                            style={{ cursor: 'grab' }}
                          >
                          </MenuOutlined>
                        </Col>
                        <Col lg={8} md={8} sm={8} xs={8} className="border-end">
                          <div className="fontroboto fw-medium">
                            <AutoComplete
                              defaultValue={item.examination_name}
                              value={item.examination_name}
                              placeholder="Examination Name"
                              bordered={false}
                              defaultOpen={false}
                              disabled={item?.pms_default ? true : false}
                              onSearch={(query) => onSearchChild(query, index)}
                              onFocus={() => onFocusChid(index)}
                              options={childSearchOptions}
                              className="autocomplete-custom w-100 inputborder"
                              defaultActiveFirstOption={true}
                              onSelect={(data, e) => onSelectChild(data, e, index)}
                            />
                          </div>
                        </Col>
                        <Col lg={14} md={14} sm={13} xs={13} className="border-end">
                          <Input
                            className="notesinput border-0"
                            placeholder="Notes"
                            defaultValue={item.note}
                            value={item.note}
                            onChange={(e) => onChangeNoteChild(e, index)}
                          />
                        </Col>
                        <Col lg={1} md={1} sm={2} xs={2} className="text-center">
                          <Button
                            className="btn py-0 btn-delete-prescription px-0"
                            onClick={() => onRemoveRow(index)}
                          >
                            {isVoiceRxModuleEnabled ? <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" /> : <i className="icon-delete"></i>}
                          </Button>
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
  }, [examinationData, childSearchOptions]);

  //Child Componet
  // const TABLE_EXAMINATION = useMemo(() => {
  //   return (
  //     examinationData.length > 0 &&
  //     examinationData.map((item, index) => {
  //       return (
  //         <Row
  //           key={index}
  //           gutter={[0]}
  //           className={`${index === 0 && "mt-14 border-top"} align-items-center border-bottom`}
  //         >
  //           <Col lg={9} md={9} sm={9} xs={9} className="border-end">
  //             <div className="fontroboto fw-medium">
  //               <AutoComplete
  //                 defaultValue={item.examination_name}
  //                 value={item.examination_name}
  //                 placeholder="Examination Name"
  //                 bordered={false}
  //                 defaultOpen={false}
  //                 onSearch={(query) => onSearchChild(query, index)}
  //                 onFocus={() => onFocusChid(index)}
  //                 options={childSearchOptions}
  //                 className="autocomplete-custom w-100 inputborder"
  //                 defaultActiveFirstOption={true}
  //                 onSelect={(data, e) => onSelectChild(data, e, index)}
  //               />
  //             </div>
  //           </Col>
  //           <Col lg={14} md={14} sm={13} xs={13} className="border-end">
  //             <Input
  //               className="notesinput border-0"
  //               placeholder="Notes"
  //               defaultValue={item.note}
  //               value={item.note}
  //               onChange={(e) => onChangeNoteChild(e, index)}
  //             />
  //           </Col>
  //           <Col lg={1} md={1} sm={2} xs={2} className="text-center">
  //             <Button
  //               className="btn py-0 btn-delete-prescription px-0"
  //               onClick={() => onRemoveRow(index)}
  //             >
  //               <i className="icon-delete"></i>
  //             </Button>
  //           </Col>
  //         </Row>
  //       );
  //     })
  //   );
  // }, [examinationData, childSearchOptions]);

  //Template Componet
  const TEMPLATE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="pop-header" key="examination-template">
          <div className="align-items-center d-flex justify-content-between">
            <div className="title-common">Examination Templates</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={showHideTemplatesListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          <div className="mt-3" key="examination-template-search">
            <Input
              allowClear
              className="popinput"
              onChange={onSearch}
              placeholder="Search Templates"
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
                    <div className="title text-main2">{template.tet_template_name}</div>
                    <div className="text-truncate">
                      <span>{template.examination}</span>
                    </div>
                  </div>
                  <Button
                    className="btn btn-delete-prescription p-0 ms-2"
                    onClick={() => {
                      showHideModal(template.tet_id)
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
                  <div className="round-box">{isVoiceRxModuleEnabled ? <Grid5 color="#4C4E5C" size={18} strokeWidth={1.6} variant="Linear" /> : <i className="icon-template"></i>}</div>
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
  }, [tabChange, popOver2, inputTemplateName, loading, allTemplates]);

  const showHideClearData = useCallback(() => {
    setIsModalOpen1(!isModalOpen1);
  }, [isModalOpen1]);

  const onRemoveRows = () => {
    setExaminationData(canShowVoiceRxNewRows ? [emptyExaminationRow()] : [])
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
      <div ref={sectionRef} data-voice-rx-dictation-target="examinations" className={[voiceModuleStyles.moduleRoot, isVoiceRxModuleEnabled && voiceUpdated ? voiceModuleStyles.moduleUpdated : ""].filter(Boolean).join(" ")}>
        <div className="d-flex align-items-center justify-content-between p-14-pb0">
          <div className="d-flex align-items-center">
            <img className="me-2" src={Examinationicon} alt="Examination" />
            <div className="title-common">Examinations</div>
          </div>
          <div className="d-flex align-items-center">
            {isVoiceRxModuleEnabled && (
              <VoiceRxModuleButton
                active={voiceCaptureOpen}
                dictationTargetId="examinations"
                label="Start Examinations voice input"
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
                  <Tooltip placement="bottom" title="Browse examination templates">
                    <VoiceRxModuleActionButton type="template" label="Browse examination templates" />
                  </Tooltip>
                </span>
              ) : (
                <button className="btn d-flex align-items-center btn-text">
                  {" "}
                  <i className="icon-template me-2"></i> <span>Templates</span>
                </button>
              )}
            </Popover>
            <Tooltip placement="bottom" title={(examinationData.length > 0) ? "" : "Please enter some Examination to save a template"}>
              <Popover
                open={popOver2}
                // onOpenChange={showHideSaveTemplatePopOver}
                onOpenChange={() => (examinationData.length > 0) && showHideSaveTemplatePopOver()}
                content={SAVE_CONTENT}
                trigger="click"
                overlayClassName="pop-450 pp-0"
                placement="bottom"
              >
                {isVoiceRxModuleEnabled ? (
                  <span>
                    <VoiceRxModuleActionButton
                      type="save"
                      label="Save examination as template"
                      disabled={examinationData.length === 0}
                    />
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
                <VoiceRxModuleActionButton
                  type="clear"
                  label="Clear examinations"
                  onClick={showHideClearData}
                  disabled={examinationData.length === 0}
                />
              </Tooltip>
            ) : (
              <button onClick={showHideClearData} className="btn btn-text clear-text d-flex align-items-center" disabled={examinationData.length > 0 ? false : true}>
                <i className="icon-eraser1 me-2"></i> <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {DELETE_MODAL}
        {REMOVE_ALL_ROWS}
        {TABLE_EXAMINATION}
        {canShowVoiceRxNewRows && (
          <div className="p-2">
            <Button
              type="link"
              icon={<PlusOutlined />}
              className="add-custom-module-link"
              onClick={handleAddRow}
            >
              Add New Line
            </Button>
          </div>
        )}

        <div className={isVoiceRxModuleEnabled ? voiceCaptureOpen ? voiceModuleStyles.moduleSlot : "" : "p-14"}>
          {isVoiceRxModuleEnabled && voiceCaptureOpen ? (
            <VoiceRxModuleCapture
              moduleName="Examinations"
              previousContext={examinationsVoicePreviousContext}
              dummyDigitisedData={VOICE_MODULE_DUMMY_DIGITISED_DATA.examination}
              onCancel={() => setVoiceCaptureOpen(false)}
              onComplete={handleVoiceCaptureComplete} />
          ) : !isVoiceRxModuleEnabled ? (
            <AutoComplete
              value={searchParentQuery}
              onSearch={onSearchParent}
              options={parentSearchOptions}
              className="autocomplete-custom w-100"
              onSelect={onSelectParent}
              defaultActiveFirstOption={true}
              popupClassName={!searchParentQuery && "boxpopup"}
            >
              <Input
                placeholder="Search Examinations"
                prefix={<i className="icon-search"></i>}
              />
            </AutoComplete>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default React.memo(ExaminationBox);
