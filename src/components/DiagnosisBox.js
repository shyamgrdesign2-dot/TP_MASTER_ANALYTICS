import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from "react";
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
  Tooltip,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import CommonModal from '../common/CommonModal';

import CashManagerContext from "../context/CashManagerContext";
import { errorMessage, isNumeric, onlyNumberFormat, removeBeforeWhiteSpace, capitalizeAfterSentence, shouldMonetizationDisabled } from "../utils/utils";

import { MenuOutlined, PlusOutlined } from '@ant-design/icons';
import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getDiagnosisTemplates,
  getFrequentlySearchedDiagnosis,
  searchDiagnosis,
  getLoadPreviousDiagnosis,
  singleTemplateDetails,
} from "../redux/diagnosisSlice";

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import DifferentialDiagnosis from "./DifferentialDiagnosis";
import { ASSETS } from "../assets";
import {
  VOICE_MODULE_DUMMY_DIGITISED_DATA,
  moduleRowsToPreviousContext,
  VoiceRxModuleButton,
  VoiceRxModuleActionButton,
  VoiceRxModuleCapture,
  useVoiceRxModuleCapture,
} from "./dr-agent/voicerx/VoiceRxModuleCapture";
import { Grid5, Trash } from "iconsax-reactjs";
import voiceModuleStyles from "./dr-agent/voicerx/VoiceRxModuleCapture.module.scss";
import { GB_VOICE_RX_NEW_UI } from "../utils/constants";
import { appendStripped, stripEmptyRows } from "../utils/voiceRxRowStrip";
const {
  alerticon: alertIcon,
  diagnosis: Diagnosisicon,
} = ASSETS.images;

function DiagnosisBox({handleDDxDrawer, generatedDDx, getGenerateDDx, isDDxLoading, handleDDxKnowMore, isDDxGenerated, showVoiceRxModule}) {
  const {
    selectedDiagnosisList,
    parentOptionsList,
    childOptionsList,
    templates,
    loading,
  } = useSelector((state) => state.diagnosis);
  const dispatch = useDispatch();

  const { patient_data, diagnosisData, setDiagnosisData, tcmId } = useContext(CashManagerContext);
  // const [diagnosisData, setDiagnosisData] = useState([]);

  const tp_monetization_enable = !shouldMonetizationDisabled();
  const isApexAIAccessable = useFeatureIsOn("cdss");
  const isVoiceRxModuleEnabled = Boolean(showVoiceRxModule);
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const canShowVoiceRxNewRows = isVoiceRxModuleEnabled && isVoiceRxNewFromGB;

  const ddxOptionsList = generatedDDx?.map((item) => {
    return {
      tds_id: item?._id,
      unique_id: item?._id,
      tds_name: item?.differentialDiagnosisName,
      likelihood: item?.likelihood,
      pms_default: 1,
      usage_count: 0,
      isDDx: true,
    };
  });

  const STATUS_LIST = [
    { value: "Ruled Out", label: "Ruled Out" },
    { value: "Suspected", label: "Suspected" },
    { value: "Confirmed", label: "Confirmed" },
  ];

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
  const [sinceOptions, setSinceOptions] = useState([]);
  const SINCE_OPTIONS = [
    { value: "Hour", label: "Hour" },
    { value: "Day", label: "Day" },
    { value: "Week", label: "Week" },
    { value: "Month", label: "Month" },
    { value: "Year", label: "Year" },
  ];

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
  const emptyDiagnosisRow = () => ({ tds_name: "", tds_id: 0, unique_id: uuidv4(), change: 1, pms_default: 0, icd_code: "", since: "", status: "", note: "" });

  const applyVoiceDiagnosis = useCallback((nextDiagnosis) => {
    if (nextDiagnosis.length > 0) {
      if (canShowVoiceRxNewRows) {
        const last = nextDiagnosis[nextDiagnosis.length - 1];
        const withTrailing = (!last || last.tds_name !== "") ? [...nextDiagnosis, emptyDiagnosisRow()] : nextDiagnosis;
        setDiagnosisData(withTrailing);
      } else {
        setDiagnosisData(nextDiagnosis);
      }
    }
  }, [canShowVoiceRxNewRows, setDiagnosisData]); // eslint-disable-line react-hooks/exhaustive-deps

  // add one trailing empty row on mount (only when flag is on)
  useEffect(() => {
    if (!canShowVoiceRxNewRows) return;
    setDiagnosisData(prev => {
      const last = prev[prev.length - 1];
      if (!last || last.tds_name !== "") {
        return [...prev, emptyDiagnosisRow()];
      }
      return prev;
    });
  }, [canShowVoiceRxNewRows]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddRow = useCallback(() => {
    setDiagnosisData(prev => [...prev, emptyDiagnosisRow()]);
  }, [setDiagnosisData]);
  const diagnosisVoicePreviousContext = useMemo(
    () => moduleRowsToPreviousContext(diagnosisData, "diagnosis"),
    [diagnosisData]
  );
  const {
    voiceCaptureOpen,
    setVoiceCaptureOpen,
    voiceUpdated,
    handleVoiceCaptureComplete,
    sectionRef,
  } = useVoiceRxModuleCapture({
    moduleName: "Diagnosis",
    onApply: applyVoiceDiagnosis,
    successMessage: "Diagnosis filled from voice dictation",
    copyPayloadKeys: ["diagnosis", "diagnoses"],
  });

  useEffect(() => {
    if (selectedDiagnosisList.length > 0) {
      const updatedData = diagnosisData.map((e, i) => {
        return { ...e, ...selectedDiagnosisList[i], change: 0 };
      });
      setDiagnosisData(updatedData);
    }
  }, [selectedDiagnosisList]);

  useEffect(() => {
    dispatch(getDiagnosisTemplates());
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
          searchDiagnosis({ searchQuery: searchParentQuery, type: "parent" })
        );
      }, 500);

      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      dispatch(getFrequentlySearchedDiagnosis());
    }
  }, [searchParentQuery]);

  useEffect(() => {
    const data = [];
    parentOptionsList.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e, unique_id: uuidv4() }),
        value: e.tds_name,
        label: <div>{`${e.tds_name} ${e?.icd_code ? `(${e?.icd_code})` : ''}`}</div>,
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
      searchParentQuery && parentOptionsList.findIndex(e => e.tds_name?.toLowerCase()?.trim() == searchParentQuery?.toLowerCase()?.trim()) === -1 &&
        data.push({
          key: JSON.stringify({
            unique_id: uuidv4(),
            change: 1,
            tds_id: 0,
            tds_name: searchParentQuery,
            pms_default: 0,
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
    },
    [searchParentQuery]
  );

  const onSelectParent = useCallback(
    (data, e) => {
      diagnosisData.push({
        ...JSON.parse(e.key),
        since: "",
        status: "",
        note: "",
      });
      setDiagnosisData((prev) => [...prev]);
      setSearchParentQuery("");
    },
    [searchParentQuery, diagnosisData]
  );

  const onSelectDDx = (e) => {
    diagnosisData.push({
      ...e,
      since: "",
      status: "",
      note: "",
    });
    setDiagnosisData((prev) => [...prev]);
    setSearchParentQuery("");
  };

  //Child AutoComplete
  useEffect(() => {
    if (searchChildQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchDiagnosis({
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
        value: e.tds_name,
        label: <div>{`${e.tds_name} ${e?.icd_code ? `(${e?.icd_code})` : ''}`}</div>,
      });
    });
    if (searchChildQuery?.query && childOptionsList.findIndex(e => e.tds_name?.toLowerCase()?.trim() == searchChildQuery?.query?.toLowerCase()?.trim()) === -1) {
      data.push({
        key: JSON.stringify({
          ...diagnosisData[searchChildQuery.index],
          unique_id: uuidv4(),
          change: 1,
          tds_name: searchChildQuery.query,
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
    setSearchChildQuery({ query: diagnosisData[i].tds_name, index: i });
    dispatch(
      searchDiagnosis({ searchQuery: diagnosisData[i].tds_name, type: "child" })
    );
  };

  const onSearchChild = useCallback(
    (query, i) => {
      const updateQuery = removeBeforeWhiteSpace(query)
      diagnosisData[i] = {
        ...diagnosisData[i],
        change: 1,
        tds_name: updateQuery
      };
      setDiagnosisData((prev) => [...prev]);
      setSearchChildQuery({ query: updateQuery, index: i });
    },
    [searchChildQuery, diagnosisData]
  );

  const onSelectChild = useCallback(
    (data, e, i) => {
      diagnosisData[i] = { ...diagnosisData[i], ...JSON.parse(e.key) };
      setDiagnosisData((prev) => [...prev]);
      setSearchChildQuery({ query: JSON.parse(e.key).tds_name, index: i });
      if (canShowVoiceRxNewRows && i === diagnosisData.length - 1) {
        setDiagnosisData((prev) => [...prev, emptyDiagnosisRow()]);
      }
    },
    [searchChildQuery, diagnosisData, canShowVoiceRxNewRows]
  );

  const onSearchSinceChid = useCallback(
    (query, i) => {
      const updateQuery = onlyNumberFormat(query);
      diagnosisData[i].since = updateQuery;
      setDiagnosisData((prev) => [...prev]);
      if (updateQuery) {
        const options = SINCE_OPTIONS.map((option) => {
          return {
            key: Math.random(),
            value: `${updateQuery} ${updateQuery <= 1 ? option.value : `${option.value}(s)`}`,
            label: <>{`${updateQuery} ${updateQuery <= 1 ? option.label : `${option.label}(s)`}`}</>,
          };
        });
        setSinceOptions(options);
      } else {
        setSinceOptions([]);
      }
    },
    [sinceOptions, diagnosisData]
  );

  const onBlurSinceChid = useCallback(
    (i) => {
      if (isNumeric(diagnosisData[i].since)) {
        diagnosisData[i].since = `${diagnosisData[i].since} ${parseInt(diagnosisData[i].since) <= 1 ? 'Year' : 'Year(s)'}`;
        setDiagnosisData((prev) => [...prev]);
      }
    },
    [diagnosisData]
  );

  const onSelectSinceChild = useCallback(
    (data, i) => {
      setSinceOptions([]);
      diagnosisData[i].since = data;
      setDiagnosisData((prev) => [...prev]);
    },
    [sinceOptions, diagnosisData]
  );

  const onSelectStatusChild = useCallback(
    (data, i) => {
      diagnosisData[i].status = data;
      setDiagnosisData((prev) => [...prev]);
    },
    [diagnosisData]
  );

  const onChangeNoteChild = useCallback(
    (e, i) => {
      diagnosisData[i].note = e.target.value;
      setDiagnosisData((prev) => [...prev]);
    },
    [diagnosisData]
  );

  const onRemoveRow = (index) => {
    diagnosisData.splice(index, 1);
    if (canShowVoiceRxNewRows && diagnosisData.length === 0) {
      setDiagnosisData([emptyDiagnosisRow()]);
    } else {
      setDiagnosisData((prev) => [...prev]);
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
        return template.tdt_template_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });
      setMatchedTemplates(filteredTemplates);
    } else {
      setMatchedTemplates(templates);
    }
  };

  const loadPreviousClick = async () => {
    var sendData = {
      patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
      tcm_id: tcmId,
    };
    const action = await dispatch(getLoadPreviousDiagnosis(sendData));
    if (action.meta.requestStatus === "fulfilled") {
      const updatedData = action.payload.map(e => {
        return { ...e, unique_id: uuidv4() }
      })
      setDiagnosisData([...diagnosisData, ...updatedData]);

    } else {
      errorMessage(action.error)
    }
  };

  const onTemplateSelected = async (template) => {
    const action = await dispatch(singleTemplateDetails(template.tdt_id));
    if (action.meta.requestStatus === "fulfilled") {
      const updatedData = action?.payload;
      setDiagnosisData(appendStripped(diagnosisData, updatedData, "diagnosis"));
      showHideTemplatesListPopover();
    } else {
      errorMessage(action.error)
    }
  };

  const onDeleteTemplateClicked = async (tdt_id) => {
    const action = await dispatch(deleteTemplate(tdt_id));
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
    const templateDiagnosis = canShowVoiceRxNewRows ? stripEmptyRows(diagnosisData, "diagnosis") : diagnosisData;
    if (templateDiagnosis.length === 0) {
      errorMessage('At least 1 diagnosis added')
    } else if (templateDiagnosis.filter((e) => String(e.tds_name ?? "").trim() === "").length > 0) {
      errorMessage('Please fillup diagnosis name')
    } else {
      var sendData = {
        tdt_template_name: inputTemplateName,
        diagnosis: templateDiagnosis,
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
    const templateDiagnosis = canShowVoiceRxNewRows ? stripEmptyRows(diagnosisData, "diagnosis") : diagnosisData;
    if (templateDiagnosis.length === 0) {
      errorMessage('At least 1 diagnosis added')
    } else if (templateDiagnosis.filter((e) => String(e.tds_name ?? "").trim() === "").length > 0) {
      errorMessage('Please fillup diagnosis name')
    } else {
      var data = JSON.parse(inputTemplateName);
      var sendData = {
        tdt_id: data.tdt_id,
        tdt_template_name: data.tdt_template_name,
        diagnosis: templateDiagnosis,
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
  // const TABLE_DIAGNOSIS = useMemo(() => {
  //   return (
  //     diagnosisData.length > 0 &&
  //     diagnosisData.map((item, index) => {
  //       return (
  //         <Row
  //           key={index}
  //           gutter={[0]}
  //           className={`${index === 0 && "mt-14 border-top"
  //             } align-items-center border-bottom`}
  //         >
  //           <Col lg={7} md={7} sm={7} xs={7} className="border-end">
  //             <div className="fontroboto fw-medium">
  //               <AutoComplete
  //                 defaultValue={item.tds_name}
  //                 value={item.tds_name}
  //                 placeholder="Diagnosis Name"
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
  //           <Col lg={4} md={4} sm={4} xs={4} className="border-end">
  //             <AutoComplete
  //               defaultValue={item.since}
  //               value={item.since}
  //               placeholder="Since"
  //               bordered={false}
  //               defaultOpen={false}
  //               onSearch={(query) => onSearchSinceChid(query, index)}
  //               onBlur={() => onBlurSinceChid(index)}
  //               options={sinceOptions}
  //               className="autocomplete-custom w-100 inputborder"
  //               defaultActiveFirstOption={true}
  //               onSelect={(data) => onSelectSinceChild(data, index)}
  //             />
  //           </Col>
  //           <Col lg={4} md={4} sm={4} xs={4} className="border-end">
  //             <Select
  //               className="autocomplete-custom w-100 inputborder"
  //               placeholder="Status"
  //               defaultValue={item.status != "" ? item.status : null}
  //               value={item.status != "" ? item.status : null}
  //               onSelect={(data) => onSelectStatusChild(data, index)}
  //               options={STATUS_LIST}
  //               onClear={() => onSelectStatusChild("", index)}
  //               allowClear
  //             />
  //           </Col>
  //           <Col lg={8} md={8} sm={7} xs={7} className="border-end">
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
  //               <i className="icon-delete" />
  //             </Button>
  //           </Col>
  //         </Row>
  //       );
  //     })
  //   );
  // }, [diagnosisData, childSearchOptions]);

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedItems = reorder(
      diagnosisData,
      result.source.index,
      result.destination.index
    );
    setDiagnosisData(reorderedItems);
  };

  const TABLE_DIAGNOSIS = useMemo(() => {
    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="diagnosis" direction="vertical">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {diagnosisData.length > 0 &&
                diagnosisData.map((item, index) => (
                  <Draggable key={index} draggableId={`diagnosis-${index}`} index={index}>
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
                        <Col lg={6} md={6} sm={6} xs={6} className="border-end">
                          <div className="fontroboto fw-medium">
                            <AutoComplete
                              defaultValue={item.tds_name}
                              value={`${item.tds_name}${item?.icd_code ? ` (${item?.icd_code})` : ''}`}
                              placeholder="Diagnosis Name"
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
                        <Col lg={4} md={4} sm={4} xs={4} className="border-end">
                          <AutoComplete
                            defaultValue={item.since}
                            value={item.since}
                            placeholder="Since"
                            bordered={false}
                            defaultOpen={false}
                            onSearch={(query) => onSearchSinceChid(query, index)}
                            onBlur={() => onBlurSinceChid(index)}
                            options={sinceOptions}
                            className="autocomplete-custom w-100 inputborder"
                            defaultActiveFirstOption={true}
                            onSelect={(data) => onSelectSinceChild(data, index)}
                          />
                        </Col>
                        <Col lg={4} md={4} sm={4} xs={4} className="border-end">
                          <Select
                            className="autocomplete-custom w-100 inputborder"
                            placeholder="Status"
                            defaultValue={item.status != "" ? item.status : null}
                            value={item.status != "" ? item.status : null}
                            onSelect={(data) => onSelectStatusChild(data, index)}
                            options={STATUS_LIST}
                            onClear={() => onSelectStatusChild("", index)}
                            allowClear
                          />
                        </Col>
                        <Col lg={8} md={8} sm={7} xs={7} className="border-end">
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
                            {isVoiceRxModuleEnabled ? <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" /> : <i className="icon-delete" />}
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
  }, [diagnosisData, childSearchOptions]);

  //Template Componet
  const TEMPLATE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="pop-header" key="diagnosis-template">
          <div className="align-items-center d-flex justify-content-between">
            <div className="title-common">Diagnosis Templates</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={showHideTemplatesListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          <div className="mt-3" key="diagnosis-template-search">
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
                    <div className="title text-main2">{template.tdt_template_name}</div>
                    <div className="text-truncate">
                      <span>{template.diagnosis}</span>
                    </div>
                  </div>
                  <Button
                    className="btn btn-delete-prescription p-0 ms-2"
                    onClick={() => {
                      showHideModal(template.tdt_id)
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
                      isVoiceRxModuleEnabled ? <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" /> : <i className="icon-delete" />
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
            <i className="icon-Cross" />
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
              value={inputTemplateName && JSON.parse(inputTemplateName).tdt_template_name}
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Template"
              onSearch={onSearchTemplate}
              onSelect={onSelectTemplate}
              optionLabelProp="label"
              options={allTemplates.map((template) => {
                return {
                  key: JSON.stringify(template),
                  value: template.tdt_template_name,
                  label: (
                    <div key={template.tdt_id}>
                      {template.tdt_template_name}
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
                      <span>{JSON.parse(option.data.key).diagnosis}</span>
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
    setDiagnosisData(canShowVoiceRxNewRows ? [emptyDiagnosisRow()] : [])
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
                  Are you sure you want to Clear Selected <b>Diagnosis</b>?
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
      <div ref={sectionRef} data-voice-rx-dictation-target="diagnosis" className={[voiceModuleStyles.moduleRoot, isVoiceRxModuleEnabled && voiceUpdated ? voiceModuleStyles.moduleUpdated : ""].filter(Boolean).join(" ")}>
        <div className="d-flex align-items-center justify-content-between p-14-pb0">
          <div className="d-flex align-items-center">
            <img className="me-2" src={Diagnosisicon} alt="Diagnosis" />
            <div className="title-common">Diagnosis</div>
          </div>
          <div className="d-flex align-items-center">
            {isVoiceRxModuleEnabled && (
              <VoiceRxModuleButton
                active={voiceCaptureOpen}
                dictationTargetId="diagnosis"
                label="Start Diagnosis voice input"
                onClick={() => setVoiceCaptureOpen(true)} />
            )}
            {isVoiceRxModuleEnabled ? (
              <Tooltip placement="bottom" title="Load previous diagnosis">
                <VoiceRxModuleActionButton type="reload" label="Load previous diagnosis" onClick={loadPreviousClick} />
              </Tooltip>
            ) : (
              <button
                className="btn d-flex align-items-center btn-text"
                onClick={loadPreviousClick}
              >
                {" "}
                <i className="icon-reload me-2"></i> <span>Load Prev. Diagnosis</span>
              </button>
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
                  <Tooltip placement="bottom" title="Browse diagnosis templates">
                    <VoiceRxModuleActionButton type="template" label="Browse diagnosis templates" />
                  </Tooltip>
                </span>
              ) : (
                <button className="btn d-flex align-items-center btn-text">
                  {" "}
                  <i className="icon-template me-2" /> <span>Templates</span>
                </button>
              )}
            </Popover>

            <Tooltip placement="bottom" title={(diagnosisData.length > 0) ? "" : "Please enter some Diagnosis to save a template"}>
              <Popover
                open={popOver2}
                onOpenChange={() => (diagnosisData.length > 0) && showHideSaveTemplatePopOver()}
                // onOpenChange={showHideSaveTemplatePopOver}
                content={SAVE_CONTENT}
                trigger="click"
                overlayClassName="pop-450 pp-0"
                placement="bottom"
              >
                {isVoiceRxModuleEnabled ? (
                  <span>
                    <VoiceRxModuleActionButton
                      type="save"
                      label="Save diagnosis as template"
                      disabled={diagnosisData.length === 0}
                    />
                  </span>
                ) : (
                  <button className="btn d-flex align-items-center btn-text">
                    {" "}
                    <i className="icon-save me-2" /> <span>Save</span>
                  </button>
                )}
              </Popover>
            </Tooltip>
            {isVoiceRxModuleEnabled ? (
              <Tooltip placement="bottom" title="Clear this section">
                <VoiceRxModuleActionButton
                  type="clear"
                  label="Clear diagnosis"
                  onClick={showHideClearData}
                  disabled={diagnosisData.length === 0}
                />
              </Tooltip>
            ) : (
              <button onClick={showHideClearData} className="btn btn-text clear-text d-flex align-items-center" disabled={diagnosisData.length > 0 ? false : true}>
                <i className="icon-eraser1 me-2"></i> <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {DELETE_MODAL}
        {REMOVE_ALL_ROWS}
        {TABLE_DIAGNOSIS}
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

        {(isApexAIAccessable || tp_monetization_enable) && (
          <div style={{ padding: "0 14px" }}>
            <DifferentialDiagnosis
              handleDDxDrawer={handleDDxDrawer}
              ddxOptionsList={ddxOptionsList?.filter(
                (e) =>
                  ![...diagnosisData.map((e1) => e1.tds_name)].includes(
                    e.tds_name
                  )
              )}
              getGenerateDDx={getGenerateDDx}
              isDDxLoading={isDDxLoading}
              onSelectParent={onSelectDDx}
              isDiagnosis={true}
              handleDDxKnowMore={handleDDxKnowMore}
              isDDxGenerated={isDDxGenerated}
            />
          </div>
        )}
        <div className={isVoiceRxModuleEnabled ? voiceCaptureOpen ? voiceModuleStyles.moduleSlot : "" : "p-14"}>
          {isVoiceRxModuleEnabled && voiceCaptureOpen ? (
            <VoiceRxModuleCapture
              moduleName="Diagnosis"
              previousContext={diagnosisVoicePreviousContext}
              dummyDigitisedData={VOICE_MODULE_DUMMY_DIGITISED_DATA.diagnosis}
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
                placeholder="Search Diagnosis"
                prefix={<i className="icon-search" />}
              />
            </AutoComplete>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default React.memo(DiagnosisBox);
