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
import { errorMessage, isNumeric, onlyNumberFormat, removeBeforeWhiteSpace, capitalizeAfterSentence } from "../utils/utils";
import { appendStripped, stripEmptyRows } from "../utils/voiceRxRowStrip";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_VOICE_RX_NEW_UI } from "../utils/constants";

import { MenuOutlined, PlusOutlined } from '@ant-design/icons';
import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getSymptomsTemplates,
  getFrequentlySearchedSymptoms,
  searchSymptoms,
  singleTemplateDetails
} from "../redux/symptomsSlice";

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import DifferentialDiagnosis from "./DifferentialDiagnosis";
import { setIsDDxReadyToGenerate } from "../redux/ddxSlice";
import TextArea from "antd/es/input/TextArea";
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
const {
  alerticon: alertIcon,
  symptoms: Symptomsicon,
} = ASSETS.images;

function SymptomsBox({ handleDDxDrawer, generatedDDx, showVoiceRxModule }) {
  const isVoiceRxModuleEnabled = Boolean(showVoiceRxModule);
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const canShowVoiceRxNewRows = isVoiceRxModuleEnabled && isVoiceRxNewFromGB;
  const {
    selectedSymptomsList,
    parentOptionsList,
    childOptionsList,
    templates,
    loading,
  } = useSelector((state) => state.symptoms);
  const { isAutofillSelected, selectedSymptomsCollector } = useSelector(
    (state) => state.ddx
  );
  const dispatch = useDispatch();

  const { symptomsData, setSymptomsData, examinationData } = useContext(CashManagerContext);
  // const [ symptomsData, setSymptomsData] = useState([]);

  // const associatedSymptoms = generatedDDx?.map(
  //   (item) => item.assocSymptoms
  // );

  // const uniqueSymptoms = [...new Set(associatedSymptoms.flat())];

  // const ddxOptionsList = uniqueSymptoms
  //   ?.map((item) => {
  //     return {
  //       symptom_name: item,
  //       usage_count: 0,
  //       isDDx: true,
  //     };
  //   })
  //   ?.filter(
  //     (e) =>
  //       ![...symptomsData.map((e1) => e1.symptom_name)].includes(
  //         e.symptom_name
  //       )
  //   );

  const SEVERITY_LIST = [
    { value: "Severe", label: "Severe" },
    { value: "Moderate", label: "Moderate" },
    { value: "Mild", label: "Mild" },
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
  const [showShimmer, setShowShimmer] = useState(false);
  const emptySymptomRow = () => ({ symptom_name: "", unique_id: uuidv4(), since: "", severity: "", note: "", change: 1, pms_default: 0 });

  const applyVoiceSymptoms = useCallback((nextSymptoms) => {
    if (nextSymptoms.length > 0) {
      if (canShowVoiceRxNewRows) {
        const last = nextSymptoms[nextSymptoms.length - 1];
        const withTrailing = (!last || last.symptom_name !== "") ? [...nextSymptoms, emptySymptomRow()] : nextSymptoms;
        setSymptomsData(withTrailing);
      } else {
        setSymptomsData(nextSymptoms);
      }
    }
  }, [canShowVoiceRxNewRows, setSymptomsData]); // eslint-disable-line react-hooks/exhaustive-deps

  // add one trailing empty row on mount (only when flag is on)
  useEffect(() => {
    if (!canShowVoiceRxNewRows) return;
    setSymptomsData(prev => {
      const last = prev[prev.length - 1];
      if (!last || last.symptom_name !== "") {
        return [...prev, emptySymptomRow()];
      }
      return prev;
    });
  }, [canShowVoiceRxNewRows]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddRow = useCallback(() => {
    setSymptomsData(prev => [...prev, emptySymptomRow()]);
  }, [setSymptomsData]);
  const symptomsVoicePreviousContext = useMemo(
    () => moduleRowsToPreviousContext(symptomsData, "symptoms"),
    [symptomsData]
  );
  const {
    voiceCaptureOpen,
    setVoiceCaptureOpen,
    voiceUpdated,
    handleVoiceCaptureComplete,
    sectionRef,
  } = useVoiceRxModuleCapture({
    moduleName: "Symptoms",
    onApply: applyVoiceSymptoms,
    successMessage: "Symptoms filled from voice dictation",
    copyPayloadKeys: ["symptoms"],
  });

  useEffect(() => {
    if (isAutofillSelected) {
      setShowShimmer(true);
      const timer = setTimeout(() => {
        setShowShimmer(false);
      }, 1000); // 1 seconds

      return () => clearTimeout(timer); // Cleanup timeout
    }
  }, [isAutofillSelected]);

  useEffect(() => {
    if (selectedSymptomsList.length > 0) {
      const updatedData = symptomsData.map((e, i) => {
        return { ...e, ...selectedSymptomsList[i] };
      });
      setSymptomsData(updatedData);
    }
  }, [selectedSymptomsList]);

  useEffect(() => {
    dispatch(getSymptomsTemplates());
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
          searchSymptoms({ searchQuery: searchParentQuery, type: "parent" })
        );
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      dispatch(getFrequentlySearchedSymptoms());
    }
  }, [searchParentQuery]);

  useEffect(() => {
    const data = [];
    parentOptionsList.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e, unique_id: uuidv4() }),
        value: e.symptom_name,
        label: <div>{e.symptom_name}</div>,
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
      searchParentQuery && parentOptionsList.findIndex(e => e.symptom_name?.toLowerCase()?.trim() == searchParentQuery?.toLowerCase()?.trim()) === -1 &&
        data.push({
          key: JSON.stringify({
            unique_id: uuidv4(),
            change: 1,
            pms_default: 0,
            symptom_name: searchParentQuery
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
      window.Moengage.track_event("symptom_select", {
        "value": data
      });
      symptomsData.push({
        ...JSON.parse(e.key),
        since: "",
        severity: "",
        note: "",
      });
      setSymptomsData((prev) => [...prev]);
      setSearchParentQuery("");
      dispatch(setIsDDxReadyToGenerate(true));
    },
    [searchParentQuery, symptomsData]
  );

  const onSelectDDx = (e) => {
    symptomsData.push({
      ...e,
      since: "",
      severity: "",
      note: "",
    });
    setSymptomsData((prev) => [...prev]);
    setSearchParentQuery("");
    dispatch(setIsDDxReadyToGenerate(true));
  };

  useEffect(() => {
    if (
      isAutofillSelected &&
      selectedSymptomsCollector &&
      Object.keys(selectedSymptomsCollector)?.length > 0
    ) {
      selectedSymptomsCollector?.symptoms?.forEach((symptom) => {
        // Check if symptom already exists in symptomsData
        const symptomExists = symptomsData.some(
          (existingSymptom) =>
            existingSymptom.symptom_name?.toLowerCase() ===
            symptom.name?.toLowerCase()
        );

        // Only add if symptom doesn't exist
        if (!symptomExists) {
          symptomsData.push({
            symptom_name: symptom.name,
            since: symptom.duration,
            severity: symptom.severity,
            note: symptom.notes,
          });
          setSymptomsData((prev) => [...prev]);
        }
      });
    }
  }, [isAutofillSelected, selectedSymptomsCollector]);

  //Child AutoComplete
  useEffect(() => {
    if (searchChildQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchSymptoms({
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
        value: e.symptom_name,
        label: <div>{e.symptom_name}</div>,
      });
    });
    if (searchChildQuery?.query && childOptionsList.findIndex(e => e.symptom_name?.toLowerCase()?.trim() == searchChildQuery?.query?.toLowerCase()?.trim()) === -1) {
      data.push({
        key: JSON.stringify({
          ...symptomsData[searchChildQuery.index],
          unique_id: uuidv4(),
          change: 1,
          pms_default: 0,
          symptom_name: searchChildQuery.query
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
    setSearchChildQuery({ query: symptomsData[i].symptom_name, index: i });
    dispatch(
      searchSymptoms({ searchQuery: symptomsData[i].symptom_name, type: "child" })
    );
  };

  const onSearchChild = useCallback(
    (query, i) => {
      const updateQuery = removeBeforeWhiteSpace(query)
      // ?.replace(/,/g, '')
      symptomsData[i] = {
        ...symptomsData[i],
        change: 1,
        symptom_name: updateQuery
      };
      setSymptomsData((prev) => [...prev]);
      setSearchChildQuery({ query: updateQuery, index: i });
    },
    [searchChildQuery, symptomsData]
  );

  const onSelectChild = useCallback(
    (data, e, i) => {
      symptomsData[i] = { ...symptomsData[i], ...JSON.parse(e.key) };
      setSymptomsData((prev) => [...prev]);
      setSearchChildQuery({ query: JSON.parse(e.key).symptom_name, index: i });
      dispatch(setIsDDxReadyToGenerate(true));
      if (canShowVoiceRxNewRows && i === symptomsData.length - 1) {
        setSymptomsData((prev) => [...prev, emptySymptomRow()]);
      }
    },
    [searchChildQuery, symptomsData, canShowVoiceRxNewRows]
  );

  const onSearchSinceChid = useCallback(
    (query, i) => {
      const updateQuery = onlyNumberFormat(query);
      symptomsData[i].since = updateQuery;
      setSymptomsData((prev) => [...prev]);
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
    [sinceOptions, symptomsData]
  );

  const onBlurSinceChid = useCallback(
    (i) => {
      if (isNumeric(symptomsData[i].since)) {
        symptomsData[i].since = `${symptomsData[i].since} ${parseInt(symptomsData[i].since) <= 1 ? 'Day' : 'Day(s)'}`;
        setSymptomsData((prev) => [...prev]);
      }
    },
    [symptomsData]
  );

  const onSelectSinceChild = useCallback(
    (data, i) => {
      setSinceOptions([]);
      symptomsData[i].since = data;
      setSymptomsData((prev) => [...prev]);
      dispatch(setIsDDxReadyToGenerate(true));
    },
    [sinceOptions, symptomsData]
  );

  const onSelectSeverityChild = useCallback(
    (data, i) => {
      symptomsData[i].severity = data;
      setSymptomsData((prev) => [...prev]);
      dispatch(setIsDDxReadyToGenerate(true));
    },
    [symptomsData]
  );

  const onChangeNoteChild = useCallback(
    (e, i) => {
      symptomsData[i].note = e.target.value;
      // ?.replace(/,/g, '')
      setSymptomsData((prev) => [...prev]);
      dispatch(setIsDDxReadyToGenerate(true));
    },
    [symptomsData]
  );

  const onRemoveRow = (index) => {
    symptomsData.splice(index, 1);
    if (canShowVoiceRxNewRows && symptomsData.length === 0) {
      setSymptomsData([emptySymptomRow()]);
    } else {
      setSymptomsData((prev) => [...prev]);
    }
    if (symptomsData?.length > 0) {
      dispatch(setIsDDxReadyToGenerate(true));
    } else if (examinationData?.length === 0) {
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
        return template.tst_template_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });
      setMatchedTemplates(filteredTemplates);
    } else {
      setMatchedTemplates(templates);
    }
  };

  const onTemplateSelected = async (template) => {
    window.Moengage.track_event("symptom_template_used", {
      "template_name": template.tst_template_name
    });
    const action = await dispatch(singleTemplateDetails(template.tst_id));
    if (action.meta.requestStatus === "fulfilled") {
      const updatedData = action?.payload;
      setSymptomsData(appendStripped(symptomsData, updatedData, "symptoms"));
      showHideTemplatesListPopover();
    } else {
      errorMessage(action.error)
    }
  };

  const onDeleteTemplateClicked = async (tst_id) => {
    const action = await dispatch(deleteTemplate(tst_id));
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
    const templateSymptoms = canShowVoiceRxNewRows ? stripEmptyRows(symptomsData, "symptoms") : symptomsData;
    if (templateSymptoms.length === 0) {
      errorMessage('At least 1 symptom added')
    } else if (templateSymptoms.filter(e => String(e.symptom_name ?? "").trim() === "").length > 0) {
      errorMessage('Please fillup symptom name')
    } else {
      var sendData = {
        tst_template_name: inputTemplateName,
        symptoms: templateSymptoms,
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
    const templateSymptoms = canShowVoiceRxNewRows ? stripEmptyRows(symptomsData, "symptoms") : symptomsData;
    if (templateSymptoms.length === 0) {
      errorMessage('At least 1 symptom added')
    } else if (templateSymptoms.filter(e => String(e.symptom_name ?? "").trim() === "").length > 0) {
      errorMessage('Please fillup symptom name')
    } else {
      var data = JSON.parse(inputTemplateName);
      var sendData = {
        tst_id: data.tst_id,
        tst_template_name: data.tst_template_name,
        symptoms: templateSymptoms,
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
  // const TABLE_SYMPTOMS = useMemo(() => {
  //   return (
  //     symptomsData.length > 0 &&
  //     symptomsData.map((item, index) => {
  //       return (
  //         <Row
  //           key={index}
  //           gutter={[0]}
  //           className={`${index === 0 && "mt-14 border-top"} align-items-center border-bottom`}
  //         >
  //           <Col lg={7} md={7} sm={7} xs={7} className="border-end">
  //             <div className="fontroboto fw-medium">
  //               <AutoComplete
  //                 defaultValue={item.symptom_name}
  //                 value={item.symptom_name}
  //                 placeholder="Symptom Name"
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
  //               placeholder="Severity"
  //               defaultValue={item.severity != "" ? item.severity : null}
  //               value={item.severity != "" ? item.severity : null}
  //               onSelect={(data) => onSelectSeverityChild(data, index)}
  //               options={SEVERITY_LIST}
  //               onClear={() => onSelectSeverityChild("", index)}
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
  //               <i className="icon-delete"></i>
  //             </Button>
  //           </Col>
  //         </Row>
  //       );
  //     })
  //   );
  // }, [symptomsData, childSearchOptions]);

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedItems = reorder(
      symptomsData,
      result.source.index,
      result.destination.index
    );
    setSymptomsData(reorderedItems);
  };

  const TABLE_SYMPTOMS = useMemo(() => {
    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="symptoms" direction="vertical">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="mt-2">
              {symptomsData.length > 0 &&
                symptomsData.map((item, index) => (
                  <Draggable key={index} draggableId={`symptom-${index}`} index={index}>
                    {(provided) => (
                      <Row
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        key={index}
                        gutter={0}
                        className="symptoms-table-row"
                      >
                        <Col lg={1} md={1} sm={1} xs={1} className="symptoms-table-cell center">
                          <MenuOutlined
                            {...provided.dragHandleProps}
                            className="drag-handle"
                            style={{ cursor: "grab" }}
                          />
                        </Col>
                        <Col lg={6} md={6} sm={6} xs={6} className="symptoms-table-cell">
                          <AutoComplete
                            defaultValue={item.symptom_name}
                            value={item.symptom_name}
                            placeholder="Symptom Name"
                            bordered={false}
                            defaultOpen={false}
                            disabled={item?.pms_default ? true : false}
                            onSearch={(query) => onSearchChild(query, index)}
                            onFocus={() => onFocusChid(index)}
                            options={childSearchOptions}
                            className="autocomplete-custom w-100"
                            defaultActiveFirstOption={true}
                            onSelect={(data, e) => onSelectChild(data, e, index)}
                          />
                        </Col>
                        <Col lg={3} md={3} sm={3} xs={3} className="border-end">
                          <AutoComplete
                            defaultValue={item.since}
                            value={item.since}
                            placeholder="Since"
                            bordered={false}
                            defaultOpen={false}
                            onSearch={(query) => onSearchSinceChid(query, index)}
                            onBlur={() => onBlurSinceChid(index)}
                            options={sinceOptions}
                            className="autocomplete-custom w-100"
                            defaultActiveFirstOption={true}
                            onSelect={(data) => onSelectSinceChild(data, index)}
                          />
                        </Col>
                        <Col lg={3} md={3} sm={3} xs={3} className="border-end">
                          <Select
                            className="autocomplete-custom w-100 symptoms-select-box"
                            placeholder="Severity"
                            defaultValue={item.severity !== "" ? item.severity : null}
                            value={item.severity !== "" ? item.severity : null}
                            onSelect={(data) => onSelectSeverityChild(data, index)}
                            options={SEVERITY_LIST}
                            onClear={() => onSelectSeverityChild("", index)}
                            allowClear
                          />
                        </Col>
                        <Col lg={10} md={10} sm={9} xs={9} className="border-end">
                          <Input
                            className="notesinput border-0"
                            placeholder="Notes"
                            defaultValue={item.note}
                            value={item.note}
                            onChange={(e) => onChangeNoteChild(e, index)}
                            autoSize={{
                              minRows: 1,
                              maxRows: 3,
                            }}
                            style={{
                              border: "none",
                              boxShadow: "none",
                              padding: "11px 12px",
                            }}
                          />
                        </Col>
                        <Col lg={1} md={1} sm={2} xs={2} className="symptoms-table-cell center">
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
  }, [symptomsData, childSearchOptions]);

  //Template Componet
  const TEMPLATE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="pop-header" key="symptoms-template">
          <div className="align-items-center d-flex justify-content-between">
            <div className="title-common">Symptoms Templates</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={showHideTemplatesListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          <div className="mt-3" key="symptoms-template-search">
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
                    <div className="title text-main2">{template.tst_template_name}</div>
                    <div className="text-truncate">
                      <span>{template.symptoms}</span>
                    </div>
                  </div>
                  <Button
                    className="btn btn-delete-prescription p-0 ms-2"
                    onClick={() => {
                      showHideModal(template.tst_id)
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
              value={inputTemplateName && JSON.parse(inputTemplateName).tst_template_name}
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Template"
              onSearch={onSearchTemplate}
              onSelect={onSelectTemplate}
              optionLabelProp="label"
              options={allTemplates.map((template) => {
                return {
                  key: JSON.stringify(template),
                  value: template.tst_template_name,
                  label: (
                    <div key={template.tst_id}>
                      {template.tst_template_name}
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
                      <span>{JSON.parse(option.data.key).symptoms}</span>
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
    setSymptomsData(canShowVoiceRxNewRows ? [emptySymptomRow()] : [])
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
                  Are you sure you want to Clear Selected <b>Symptoms</b>?
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

  const TableShimmerLoader = () => {
    return (
      <div className="sc-shimmer-container-table p-14">
        {/* First row */}
        <div className="shimmer-row">
          <div className="shimmer-cell" />
          <div className="shimmer-cell" />
          <div className="shimmer-cell" />
          <div className="shimmer-cell" />
        </div>

        {/* Second row */}
        <div className="shimmer-row">
          <div className="shimmer-cell" />
          <div className="shimmer-cell" />
          <div className="shimmer-cell" />
          <div className="shimmer-cell" />
        </div>
      </div>
    );
  };

  return (
    <>
      <div ref={sectionRef} data-voice-rx-dictation-target="symptoms" className={[voiceModuleStyles.moduleRoot, isVoiceRxModuleEnabled && voiceUpdated ? voiceModuleStyles.moduleUpdated : ""].filter(Boolean).join(" ")}>
        <div className="d-flex align-items-center justify-content-between p-14-pb0">
          <div className="d-flex align-items-center">
            <img className="me-2" src={Symptomsicon} alt="Symptoms" />
            <div className="title-common">Symptoms</div>
          </div>
          <div className="d-flex align-items-center">
            {isVoiceRxModuleEnabled && (
              <VoiceRxModuleButton
                active={voiceCaptureOpen}
                dictationTargetId="symptoms"
                label="Start Symptoms voice input"
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
                  <Tooltip placement="bottom" title="Browse symptoms templates">
                    <VoiceRxModuleActionButton type="template" label="Browse symptoms templates" />
                  </Tooltip>
                </span>
              ) : (
                <button className="btn d-flex align-items-center btn-text">
                  {" "}
                  <i className="icon-template me-2"></i> <span>Templates</span>
                </button>
              )}
            </Popover>
            <Tooltip placement="bottom" title={(symptomsData.length > 0) ? "" : "Please enter some Symptoms to save a template"}>
              <Popover
                open={popOver2}
                onOpenChange={() => (symptomsData.length > 0) && showHideSaveTemplatePopOver()}
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
                      label="Save symptoms as template"
                      disabled={symptomsData.length === 0}
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
                  label="Clear symptoms"
                  onClick={showHideClearData}
                  disabled={symptomsData.length === 0}
                />
              </Tooltip>
            ) : (
              <button onClick={showHideClearData} className="btn btn-text clear-text d-flex align-items-center" disabled={symptomsData.length > 0 ? false : true}>
                <i className="icon-eraser1 me-2"></i> <span>Clear</span>
              </button>
            )}
          </div>
        </div>
        {showShimmer ? <TableShimmerLoader /> : (
          <>
            {DELETE_MODAL}
            {REMOVE_ALL_ROWS}
            {TABLE_SYMPTOMS}
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

        {/* {ddxOptionsList?.length > 0 && (
          <div style={{ padding: "0 14px" }}>
            <DifferentialDiagnosis
              handleDDxDrawer={handleDDxDrawer}
              ddxOptionsList={ddxOptionsList}
              onSelectParent={onSelectDDx}
              isSymptoms={true}
            />
          </div>
        )} */}
        <div className={isVoiceRxModuleEnabled ? voiceCaptureOpen ? voiceModuleStyles.moduleSlot : "" : "p-14"}>
          {isVoiceRxModuleEnabled && voiceCaptureOpen ? (
            <VoiceRxModuleCapture
              moduleName="Symptoms"
              previousContext={symptomsVoicePreviousContext}
              dummyDigitisedData={VOICE_MODULE_DUMMY_DIGITISED_DATA.symptoms}
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
                placeholder="Search Symptoms"
                prefix={<i className="icon-search"></i>}
              />
            </AutoComplete>
          ) : null}
        </div>
        </>
        )}
      </div>
    </>
  );
}

export default React.memo(SymptomsBox);
