import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from "react";
import { v4 as uuidv4 } from 'uuid';
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
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import CommonModal from "../common/CommonModal";

import CashManagerContext from "../context/CashManagerContext";
import {
  errorMessage,
  removeBeforeWhiteSpace,
  capitalizeAfterSentence,
  getClinicName,
} from "../utils/utils";
import { appendStripped, stripEmptyRows } from "../utils/voiceRxRowStrip";

import { MenuOutlined } from "@ant-design/icons";
import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getExaminationTemplates,
  searchExamination,
  createSurgery,
} from "../redux/surgicalSlice";
import ApiSurgical from "../api/services/ApiSurgical";

import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useLocation } from "react-router-dom";
import { GB_APOLLO_DISABLE_FEATURE, GB_VOICE_RX_NEW_UI } from "../utils/constants";
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
  surgery: surgeryIcon,
} = ASSETS.images;

const { TextArea } = Input;

function SurgicalBox({ showVoiceRxModule }) {
  const {
    selectedSurgicalList,
    parentOptionsList,
    childOptionsList,
    templates,
    loading,
  } = useSelector((state) => state.surgical);
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.doctors);

  const { state } = useLocation();
  const { patient_data } = state;

  const { surgeriesData, setSurgeriesData } = useContext(CashManagerContext);
  const isVoiceRxModuleEnabled = Boolean(showVoiceRxModule);
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const canShowVoiceRxNewRows = isVoiceRxModuleEnabled && isVoiceRxNewFromGB;
  const emptySurgeryRow = () => ({ masterId: uuidv4(), name: "", notes: "" });
  const mapSurgeryMasterRecord = useCallback((record) => {
    if (typeof record === "string" || typeof record === "number") {
      return { masterId: record };
    }
    if (!record || typeof record !== "object") return null;
    const { id, ...rest } = record;
    return {
      masterId: record.masterId || id,
      ...rest,
    };
  }, []);
  const findLocalSurgeryMaster = useCallback((name) => {
    const normalizedName = String(name || "").trim().toLowerCase();
    if (!normalizedName) return null;
    const match = [...(parentOptionsList || []), ...(childOptionsList || [])].find((item) => (
      String(item?.name || "").trim().toLowerCase() === normalizedName
    ));
    return match ? mapSurgeryMasterRecord(match) : null;
  }, [childOptionsList, mapSurgeryMasterRecord, parentOptionsList]);
  const findSurgeryMasterByName = useCallback(async (name) => {
    const normalizedName = String(name || "").trim().toLowerCase();
    if (!normalizedName) return null;

    const localMatch = findLocalSurgeryMaster(name);
    if (localMatch) return localMatch;

    const result = await ApiSurgical.searchExamination(name);
    const exactMatch = Array.isArray(result)
      ? result.find((item) => String(item?.name || "").trim().toLowerCase() === normalizedName)
      : null;
    return exactMatch ? mapSurgeryMasterRecord(exactMatch) : null;
  }, [findLocalSurgeryMaster, mapSurgeryMasterRecord]);
  const createCustomSurgeryRecord = useCallback(async (name) => {
    const created = await ApiSurgical.createSurgery({ name });
    const createdRecord = mapSurgeryMasterRecord(created) || { masterId: created?.id, name };
    const masterRecord = await findSurgeryMasterByName(name).catch(() => null);
    return {
      ...createdRecord,
      ...masterRecord,
      masterId: masterRecord?.masterId || createdRecord.masterId,
      name: masterRecord?.name || createdRecord.name || name,
      change: createdRecord.change ?? 1,
    };
  }, [findSurgeryMasterByName, mapSurgeryMasterRecord]);
  const enrichVoiceSurgeryRows = useCallback(async (rows) => {
    const enrichedRows = [];

    for (const row of rows) {
      const name = String(row?.name || row?.surgery_name || row?.procedure_name || "").trim();
      if (!name) continue;

      let resolvedMaster;
      try {
        const masterRecord = await findSurgeryMasterByName(name);
        resolvedMaster = masterRecord || await createCustomSurgeryRecord(name);
      } catch (error) {
        console.error("VoiceRx surgery master enrichment failed:", error);
        resolvedMaster = {
          masterId: row?.masterId || uuidv4(),
          name,
          change: row?.change ?? 1,
        };
      }
      enrichedRows.push({
        ...row,
        ...resolvedMaster,
        masterId: resolvedMaster?.masterId || row?.masterId || uuidv4(),
        name: resolvedMaster?.name || name,
        notes: row?.notes ?? row?.note ?? "",
      });
    }

    return enrichedRows;
  }, [createCustomSurgeryRecord, findSurgeryMasterByName]);
  const applyVoiceSurgeries = useCallback(async (nextSurgeries) => {
    if (nextSurgeries.length > 0) {
      const enrichedSurgeries = await enrichVoiceSurgeryRows(nextSurgeries);
      if (canShowVoiceRxNewRows) {
        const last = enrichedSurgeries[enrichedSurgeries.length - 1];
        const withTrailing = (!last || last.name !== "") ? [...enrichedSurgeries, emptySurgeryRow()] : enrichedSurgeries;
        setSurgeriesData(withTrailing);
      } else {
        setSurgeriesData(enrichedSurgeries);
      }
    }
  }, [canShowVoiceRxNewRows, enrichVoiceSurgeryRows, setSurgeriesData]); // eslint-disable-line react-hooks/exhaustive-deps
  const surgeriesVoicePreviousContext = useMemo(
    () => moduleRowsToPreviousContext(surgeriesData, "surgery"),
    [surgeriesData]
  );
  const {
    voiceCaptureOpen,
    setVoiceCaptureOpen,
    voiceUpdated,
    handleVoiceCaptureComplete,
    sectionRef,
  } = useVoiceRxModuleCapture({
    moduleName: "Surgeries/Procedures",
    onApply: applyVoiceSurgeries,
    successMessage: "Surgeries/Procedures filled from voice dictation",
    copyPayloadKeys: ["surgeries"],
  });

  const isApolloHosBusinessIdAccessableFromGB = useFeatureIsOn(GB_APOLLO_DISABLE_FEATURE);

  useEffect(() => {
    if (!canShowVoiceRxNewRows) return;
    setSurgeriesData(prev => {
      const last = prev[prev.length - 1];
      if (!last || last.name !== "") return [...prev, emptySurgeryRow()];
      return prev;
    });
  }, [canShowVoiceRxNewRows]); // eslint-disable-line react-hooks/exhaustive-deps
  const handleAddRow = useCallback(() => {
    setSurgeriesData(prev => [...prev, emptySurgeryRow()]);
  }, [setSurgeriesData]);

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

  useEffect(() => {
    if (selectedSurgicalList?.length > 0) {
      const updatedData = surgeriesData.map((e, i) => {
        return { ...e, ...selectedSurgicalList[i] };
      });
      setSurgeriesData(updatedData);
    }
  }, [selectedSurgicalList]);

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
    } else if (searchParentQuery === "") {
      dispatch(searchExamination({ searchQuery: "", type: "parent" }));
    }
  }, [searchParentQuery]);

  useEffect(() => {
    const data = [];
    parentOptionsList.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e }),
        value: e.name,
        label: <div>{e.name}</div>,
      });
    });

    if (searchParentQuery && !isApolloHosBusinessIdAccessableFromGB) {
      const trimmedQuery = searchParentQuery.trim();
      
      if (trimmedQuery) {
        const isItemExists = parentOptionsList.some(
          item => item.name.toLowerCase() === trimmedQuery.toLowerCase()
        );

        if (!isItemExists) {
          data.push({
            key: JSON.stringify({
              change: 1,
              name: trimmedQuery,
              isCustom: true,
            }),
            value: trimmedQuery,
            label: (
              <>
                <div>
                  {trimmedQuery}
                  <i className="icon-Add mx-1 text-primary fs-6"></i>{" "}
                  <a className="fw-medium text-decoration-underline text-primary">
                    {" "}
                    Add Custom
                  </a>
                </div>
              </>
            ),
          });
        }
      }
    }
    setParentSearchOptions(data);
  }, [parentOptionsList, searchParentQuery]);

  const onSearchParent = useCallback(
    (query) => {
      setSearchParentQuery(removeBeforeWhiteSpace(query));
    },
    [searchParentQuery]
  );

  const createCustomSurgery = async (name) => {
    const masterId = await createSurgery({ name: name });
    return masterId;
  };

  const onSelectParent = useCallback(
    async (data, e) => {
      let surgeriesUpdatedData = { ...JSON.parse(e.key) };
      if (surgeriesUpdatedData?.isCustom) {
        const masterId = await createCustomSurgery(surgeriesUpdatedData.name);
        surgeriesUpdatedData = {
          ...surgeriesUpdatedData,
          masterId: masterId,
        };
      }
      surgeriesData.push({
        ...surgeriesUpdatedData,
        notes: "",
      });
      setSurgeriesData((prev) => [...prev]);
      setSearchParentQuery("");
      window.Moengage.track_event("TP_Surgery_added", {
        clinic_name: getClinicName(profile?.hospital_data),
        doctor_id: profile?.doctor_unique_id,
        patient_number: patient_data?.pm_contact_no,
        patient_id: patient_data?.patient_unique_id,
      });
    },
    [searchParentQuery, surgeriesData]
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
        key: JSON.stringify({ ...e }),
        value: e.name,
        label: <div>{e.name}</div>,
      });
    });

    if (searchChildQuery?.query) {
      const trimmedQuery = searchChildQuery.query.trim();
      
      if (trimmedQuery) {
        const isItemExists = childOptionsList.some(
          item => item.name.toLowerCase() === trimmedQuery.toLowerCase()
        );

        if (!isItemExists) {
          data.push({
            key: JSON.stringify({
              change: 1,
              name: trimmedQuery,
              isCustom: true,
            }),
            value: trimmedQuery,
            label: (
              <>
                <div>
                  {trimmedQuery}
                  <i className="icon-Add mx-1 text-primary fs-6"></i>{" "}
                  <a className="fw-medium text-decoration-underline text-primary">
                    {" "}
                    Add Custom
                  </a>
                </div>
              </>
            ),
          });
        }
      }
    }
    setChildSearchOptions(data);
  }, [childOptionsList, searchChildQuery]);

  const onFocusChid = (i) => {
    setSearchChildQuery({
      query: surgeriesData[i].name,
      index: i,
    });
    dispatch(
      searchExamination({
        searchQuery: surgeriesData[i].name,
        type: "child",
      })
    );
  };

  const onSearchChild = useCallback(
    (query, i) => {
      const updateQuery = removeBeforeWhiteSpace(query);
      surgeriesData[i] = {
        ...surgeriesData[i],
        change: 1,
        name: updateQuery,
      };
      setSurgeriesData((prev) => [...prev]);
      setSearchChildQuery({ query: updateQuery, index: i });
    },
    [searchChildQuery, surgeriesData]
  );

  const onSelectChild = useCallback(
    async (data, e, i) => {
      let surgeriesUpdatedData = { ...JSON.parse(e.key) };
      
      if (surgeriesUpdatedData?.isCustom) {
        const masterId = await createCustomSurgery(surgeriesUpdatedData.name);
        surgeriesUpdatedData = {
          ...surgeriesUpdatedData,
          masterId: masterId,
        };
        window.Moengage.track_event("TP_Surgery_added", {
          clinic_name: getClinicName(profile?.hospital_data),
          doctor_id: profile?.doctor_unique_id,
          patient_number: patient_data?.pm_contact_no,
          patient_id: patient_data?.patient_unique_id,
        });
      }

      surgeriesData[i] = {
        ...surgeriesUpdatedData,
        notes: surgeriesData[i].notes || "",
      };
      setSurgeriesData((prev) => [...prev]);
      setSearchChildQuery({
        query: surgeriesUpdatedData.name,
        index: i,
      });
      if (canShowVoiceRxNewRows && i === surgeriesData.length - 1) {
        setSurgeriesData((prev) => [...prev, emptySurgeryRow()]);
      }
    },
    [searchChildQuery, surgeriesData, canShowVoiceRxNewRows]
  );

  const onChangeNoteChild = useCallback(
    (e, i) => {
      surgeriesData[i].notes = e.target.value;
      setSurgeriesData((prev) => [...prev]);
    },
    [surgeriesData]
  );

  const onRemoveRow = (index) => {
    surgeriesData.splice(index, 1);
    if (canShowVoiceRxNewRows && surgeriesData.length === 0) {
      setSurgeriesData([emptySurgeryRow()]);
    } else {
      setSurgeriesData((prev) => [...prev]);
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
        return template.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setMatchedTemplates(filteredTemplates);
    } else {
      setMatchedTemplates(templates);
    }
  };

  const onTemplateSelected = (template) => {
    const updatedData = template.surgeries.map((e) => {
      return {
        ...e,
        masterId: e.masterId,
        notes: e.notes ? e.notes : "",
      };
    });
    setSurgeriesData(appendStripped(surgeriesData, updatedData, "surgeries"));
    showHideTemplatesListPopover();
  };

  const onDeleteTemplateClicked = async (id) => {
    const action = await dispatch(deleteTemplate(id));
    if (action.meta.requestStatus === "rejected") {
      errorMessage(action.error);
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
      const updateQuery = removeBeforeWhiteSpace(e.target.value);
      setInputTemplateName(updateQuery);
    },
    [inputTemplateName]
  );

  const onAddTemplateClicked = async () => {
    const templateSurgeries = canShowVoiceRxNewRows ? stripEmptyRows(surgeriesData, "surgeries") : surgeriesData;
    if (templateSurgeries.length === 0) {
      errorMessage("At least 1 surgeries/procedures added");
    } else if (templateSurgeries.filter((e) => String(e.name ?? "").trim() === "").length > 0) {
      errorMessage("Please fillup surgeries/procedures name");
    } else {
      var sendData = {
        name: inputTemplateName,
        surgeries: templateSurgeries,
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
    const templateSurgeries = canShowVoiceRxNewRows ? stripEmptyRows(surgeriesData, "surgeries") : surgeriesData;
    if (templateSurgeries.length === 0) {
      errorMessage("At least 1 surgeries/procedures added");
    } else if (templateSurgeries.filter((e) => String(e.name ?? "").trim() === "").length > 0) {
      errorMessage("Please fillup surgeries/procedures name");
    } else {
      var data = JSON.parse(inputTemplateName);
      var sendData = {
        name: data.name,
        surgeries: templateSurgeries,
      };
      const action = await dispatch(
        updateTemplate({ template: sendData, templateId: data.id })
      );
      if (action.meta.requestStatus === "fulfilled") {
        setInputTemplateName(null);
        showHideSaveTemplatePopOver();
      }
    }
  };

  const showHideModal = useCallback(
    (template_id) => {
      template_id !== undefined
        ? setRemoveTemplateId(template_id)
        : setRemoveTemplateId(null);
      setIsModalOpen(!isModalOpen);
    },
    [isModalOpen]
  );

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
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>Are you sure you want to delete this template?</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={() => {
                    onDeleteTemplateClicked(removeTemplateId);
                    showHideModal();
                  }}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  Yes Delete
                </div>
                <Button
                  onClick={showHideModal}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
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
      surgeriesData,
      result.source.index,
      result.destination.index
    );
    setSurgeriesData(reorderedItems);
  };

  const TABLE_EXAMINATION = useMemo(() => {
    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="surgeries" direction="vertical">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {surgeriesData.length > 0 &&
                surgeriesData.map((item, index) => (
                  <Draggable
                    key={index}
                    draggableId={`surgeries-${index}`}
                    index={index}
                  >
                    {(provided) => (
                      <Row
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        key={index}
                        gutter={[0]}
                        className={`${
                          index === 0 && "mt-14 border-top"
                        } align-items-center border-bottom`}
                      >
                        <Col
                          lg={1}
                          md={1}
                          sm={1}
                          xs={1}
                          className="text-center"
                        >
                          <MenuOutlined
                            {...provided.dragHandleProps}
                            className="drag-handle"
                            style={{ cursor: "grab" }}
                          ></MenuOutlined>
                        </Col>
                        <Col lg={8} md={8} sm={8} xs={8} className="border-end">
                          <div className="fontroboto fw-medium">
                            <AutoComplete
                              defaultValue={item.name}
                              value={item.name}
                              placeholder="Surgeries/Procedures Name"
                              bordered={false}
                              defaultOpen={false}
                              onSearch={(query) => onSearchChild(query, index)}
                              onFocus={() => onFocusChid(index)}
                              options={childSearchOptions}
                              className="autocomplete-custom w-100 inputborder"
                              defaultActiveFirstOption={true}
                              onSelect={(data, e) =>
                                onSelectChild(data, e, index)
                              }
                            />
                          </div>
                        </Col>
                        <Col
                          lg={14}
                          md={14}
                          sm={13}
                          xs={13}
                          className="border-end"
                        >
                          <TextArea
                            className="notesinput border-0"
                            placeholder="Notes"
                            defaultValue={item.notes}
                            value={item.notes}
                            autoSize={{
                              minRows: 1,
                              maxRows: 2,
                            }}
                            onChange={(e) => onChangeNoteChild(e, index)}
                          />
                        </Col>
                        <Col
                          lg={1}
                          md={1}
                          sm={2}
                          xs={2}
                          className="text-center"
                        >
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
  }, [surgeriesData, childSearchOptions]);

  //Template Componet
  const TEMPLATE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="pop-header" key="surgeries-template">
          <div className="align-items-center d-flex justify-content-between">
            <div className="title-common">Surgeries/Procedures Templates</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={showHideTemplatesListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          <div className="mt-3" key="surgeries-template-search">
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
                    <div className="title text-main2">{template.name}</div>
                    <div className="text-truncate">
                      {template?.surgeries?.map((item, ii) => {
                        return (
                          <span key={ii}>{`${item.name}${
                            template.surgeries.length - 1 != ii ? ", " : ""
                          }`}</span>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    className="btn btn-delete-prescription p-0 ms-2"
                    onClick={() => {
                      showHideModal(template.id);
                      showHideTemplatesListPopover();
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
              value={inputTemplateName && JSON.parse(inputTemplateName).name}
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Template"
              onSearch={onSearchTemplate}
              onSelect={onSelectTemplate}
              optionLabelProp="label"
              options={allTemplates.map((template) => {
                return {
                  key: JSON.stringify(template),
                  value: template.name,
                  label: <div key={template.id}>{template.name}</div>,
                };
              })}
              optionRender={(option) => (
                <div className="align-items-center d-flex text-truncate w-100">
                  <div className="round-box">
                    {isVoiceRxModuleEnabled ? <Grid5 color="#4C4E5C" size={18} strokeWidth={1.6} variant="Linear" /> : <i className="icon-template"></i>}
                  </div>
                  <div className="text-truncate w-100">
                    <div className="title text-main2">{option.data.value}</div>
                    <div className="text-truncate">
                      {JSON.parse(option.data.key).surgeries.map((item, ii) => {
                        return (
                          <span key={ii}>{`${item.name}${
                            JSON.parse(option.data.key).surgeries.length - 1 !=
                            ii
                              ? ", "
                              : ""
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

  const showHideClearData = useCallback(() => {
    setIsModalOpen1(!isModalOpen1);
  }, [isModalOpen1]);

  const onRemoveRows = () => {
    setSurgeriesData(canShowVoiceRxNewRows ? [emptySurgeryRow()] : []);
    showHideClearData();
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
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to Clear Selected{" "}
                  <b>Surgeries/Procedures</b>?
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={onRemoveRows}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  <span>Yes, Clear</span>
                </div>
                <Button
                  onClick={showHideClearData}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
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
      <div ref={sectionRef} data-voice-rx-dictation-target="surgeries" className={[voiceModuleStyles.moduleRoot, isVoiceRxModuleEnabled && voiceUpdated ? voiceModuleStyles.moduleUpdated : ""].filter(Boolean).join(" ")}>
        <div className="d-flex align-items-center justify-content-between p-14-pb0">
          <div className="d-flex align-items-center">
            <img className="me-2" src={surgeryIcon} alt="surgery-icon" />
            <div className="title-common">Surgeries/Procedures</div>
          </div>
          <div className="d-flex align-items-center">
            {isVoiceRxModuleEnabled && (
              <VoiceRxModuleButton
                active={voiceCaptureOpen}
                dictationTargetId="surgeries"
                label="Start Surgeries Procedures voice input"
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
                  <Tooltip placement="bottom" title="Browse surgery templates">
                    <VoiceRxModuleActionButton type="template" label="Browse surgery templates" />
                  </Tooltip>
                </span>
              ) : (
                <button className="btn d-flex align-items-center btn-text">
                  {" "}
                  <i className="icon-template me-2"></i> <span>Templates</span>
                </button>
              )}
            </Popover>
            <Tooltip
              placement="bottom"
              title={
                surgeriesData.length > 0
                  ? ""
                  : "Please enter some Surgeries/Procedures to save a template"
              }
            >
              <Popover
                open={popOver2}
                // onOpenChange={showHideSaveTemplatePopOver}
                onOpenChange={() =>
                  surgeriesData.length > 0 && showHideSaveTemplatePopOver()
                }
                content={SAVE_CONTENT}
                trigger="click"
                overlayClassName="pop-450 pp-0"
                placement="bottom"
              >
                {isVoiceRxModuleEnabled ? (
                  <span>
                    <VoiceRxModuleActionButton type="save" label="Save surgery as template" disabled={surgeriesData.length === 0} />
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
                <VoiceRxModuleActionButton type="clear" label="Clear surgery" onClick={showHideClearData} disabled={surgeriesData.length === 0} />
              </Tooltip>
            ) : (
              <button
                onClick={showHideClearData}
                className="btn btn-text clear-text d-flex align-items-center"
                disabled={surgeriesData.length > 0 ? false : true}
              >
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
            <Button type="link" icon={<PlusOutlined />} className="add-custom-module-link" onClick={handleAddRow}>
              Add New Line
            </Button>
          </div>
        )}

        <div className={isVoiceRxModuleEnabled ? voiceCaptureOpen ? voiceModuleStyles.moduleSlot : "" : "p-14"}>
          {isVoiceRxModuleEnabled && voiceCaptureOpen ? (
            <VoiceRxModuleCapture
              moduleName="Surgeries/Procedures"
              previousContext={surgeriesVoicePreviousContext}
              dummyDigitisedData={VOICE_MODULE_DUMMY_DIGITISED_DATA.surgeries}
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
            >
              <Input
                placeholder="Search Surgeries/Procedures"
                prefix={<i className="icon-search"></i>}
              />
            </AutoComplete>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default React.memo(SurgicalBox);
