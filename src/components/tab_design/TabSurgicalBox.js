import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { Input, Button, Drawer, Tabs, Select, Card, Spin, Tooltip } from "antd";

import { LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";

import CommonModal from "../../common/CommonModal";

import CashManagerContext from "../../context/CashManagerContext";
import {
  errorMessage,
  removeBeforeWhiteSpace,
  capitalizeAfterSentence,
} from "../../utils/utils";

import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getExaminationTemplates,
} from "../../redux/surgicalSlice";

import { SortableContainer, SortableElement } from "react-sortable-hoc";
import TabSurgicalSearch from "./TabSurgicalSearch";
import { ASSETS } from "../../assets";
const {
  alerticon: alertIcon,
  surgery: surgeryIcon,
} = ASSETS.images;

function TabSurgicalBox() {
  const { selectedSurgicalList, parentOptionsList, templates, loading } =
    useSelector((state) => state.surgical);
  const dispatch = useDispatch();

  const { surgeriesData, setSurgeriesData } = useContext(CashManagerContext);

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

  const onRemoveRow = (index) => {
    surgeriesData.splice(index, 1);
    setSurgeriesData((prev) => [...prev]);
    setSelectedIndex(null);
  };

  // Handle Parent Drawer
  const handleDrawerParent = useCallback(() => {
    setParentDrawer(!parentDrawer);
  }, [parentDrawer]);

  const onSelectParent = useCallback(
    (e) => {
      surgeriesData.push({
        ...e,
        notes: "",
      });
      setSurgeriesData((prev) => [...prev]);
      setSelectedIndex(surgeriesData.length - 1);
      handleDrawerParent();
    },
    [surgeriesData, selectedIndex, parentDrawer]
  );

  // Handle Child Drawer
  const handleDrawerChild = useCallback(
    (item) => {
      setChildDrawer(!childDrawer);
      setChildDrawerData(item);
    },
    [childDrawer, childDrawerData]
  );

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
        return template.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setMatchedTemplates(filteredTemplates);
    } else {
      setMatchedTemplates(templates);
    }
  };

  const onTemplateSelected = (template) => {
    const updatedData = template.surgeries.map((e) => {
      return { ...e, masterId: e.masterId, notes: e.notes ? e.notes : "" };
    });
    setSurgeriesData([...surgeriesData, ...updatedData]);
    handleDrawerTemplate();
  };

  const onDeleteTemplateClicked = async (id) => {
    const action = await dispatch(deleteTemplate(id));
    if (action.meta.requestStatus === "rejected") {
      errorMessage(action.error);
    }
  };

  const onChangeSaveTemplate = useCallback(
    (e) => {
      const updateQuery = removeBeforeWhiteSpace(e.target.value);
      setInputTemplateName(updateQuery);
    },
    [inputTemplateName]
  );

  const onAddTemplateClicked = async () => {
    if (surgeriesData.length === 0) {
      errorMessage("At least 1 surgeries/procedures added");
    } else if (surgeriesData.filter((e) => e.name == "").length > 0) {
      errorMessage("Please fillup surgeries/procedures name");
    } else {
      var sendData = {
        name: inputTemplateName,
        surgeries: surgeriesData,
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
    if (surgeriesData.length === 0) {
      errorMessage("At least 1 surgeries/procedures added");
    } else if (surgeriesData.filter((e) => e.name == "").length > 0) {
      errorMessage("Please fillup surgeries/procedures name");
    } else {
      var data = JSON.parse(inputTemplateName);
      var sendData = {
        name: data.name,
        surgeries: surgeriesData,
      };
      const action = await dispatch(
        updateTemplate({ template: sendData, templateId: data.id })
      );
      if (action.meta.requestStatus === "fulfilled") {
        setInputTemplateName(null);
        handleDrawerSave();
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

  const SortableItem = SortableElement(({ item }) => (
    <div
      style={{
        width:
          item.name.length > 12 && item.name.length < 24
            ? `${item.name.length * 10.5}px`
            : item.name.length >= 24
            ? "256px"
            : "150px",
      }}
      className={
        "d-flex align-items-center justify-content-between text-truncate closable-chips closable-chips-active"
      }
    >
      <div
        className="text-truncate p-2"
        onClick={() => handleDrawerChild(item)}
      >
        <div className="text-truncate">
          {item.name}
          {item.notes ? (
            <div className="text-truncate small">{item.notes}</div>
          ) : (
            <div className="text-truncate small">Add Details</div>
          )}
        </div>
      </div>
      <Button
        type="text"
        className="rounded-0 btn-close-chips"
        onClick={() => onRemoveRow(item.index)}
      >
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
      surgeriesData.length > 0 && (
        <SortableList
          items={surgeriesData}
          onSortEnd={({ oldIndex, newIndex }) => {
            const newExaminationData = [...surgeriesData];
            const [movedItem] = newExaminationData.splice(oldIndex, 1);
            newExaminationData.splice(newIndex, 0, movedItem);
            setSurgeriesData(newExaminationData);
          }}
          axis="xy"
          pressDelay={100}
        />
      )
    );
  }, [surgeriesData, childDrawerData]);

  //Template Componet
  const TEMPLATE_CONTENT = useMemo(() => {
    return (
      <>
        <div>
          <div className="medicine-templates">
            <Input
              className="popinput"
              placeholder="Search Templates"
              onChange={onSearch}
              prefix={<i className="icon-search me-2"></i>}
              allowClear
            />
          </div>
          <div className="tab-template-height">
            {matchedTemplates.length > 0 &&
              matchedTemplates.map((template, i) => {
                return (
                  <div
                    className="align-items-center d-flex justify-content-between medicine-templates"
                    key={i}
                  >
                    <div
                      className="align-items-center d-flex text-truncate w-100"
                      onClick={() => onTemplateSelected(template)}
                    >
                      <div className="round-box">
                        <i className="icon-template"></i>
                      </div>
                      <div className="text-truncate w-100">
                        <div className="title text-main2">{template.name}</div>
                        <div className="text-truncate">
                          {template.surgeries.map((item, ii) => {
                            return (
                              <span key={ii}>{`${item.name}${
                                template.surgeries.length - 1 != ii ? ", " : ""
                              }`}</span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <Button
                      className="btn btn-delete-prescription p-0 ms-3"
                      onClick={() => showHideModal(template.id)}
                    >
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
                );
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
            className="w-100"
          />
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
                    <i className="icon-template"></i>
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
  }, [tabChange, saveDrawer, inputTemplateName, loading, allTemplates]);

  const onChangeInputNoteChild = useCallback(
    (e) => {
      setChildDrawerData({
        ...childDrawerData,
        notes: e.target.value,
      });
    },
    [childDrawerData]
  );

  const updateChild = (item) => {
    const { index, ...updatedReqData } = item;
    surgeriesData[item.index] = {
      ...surgeriesData[item.index],
      ...updatedReqData,
    };
    setSurgeriesData((prev) => [...prev]);
    handleDrawerChild();
  };

  //Child Componet
  const CHILD_DRAWER_DATA = useMemo(() => {
    return (
      childDrawerData && (
        <>
          <Card bordered={false} className="search-modalCard">
            <div className="modalCard-header align-items-center justify-content-between d-flex">
              <div className="align-items-center d-flex">
                <Button
                  type="text"
                  className="btn btn-delete-prescription px-3 focus-none h-100"
                  onClick={handleDrawerChild}
                >
                  <i className="icon-Cross fs-3"></i>
                </Button>
                <div className="modal-title text-truncate-twolines">
                  {childDrawerData.name}
                </div>
              </div>
              <Button
                className="btn btn-primary3 btn-41 px-4 me-20"
                onClick={() => updateChild(childDrawerData)}
              >
                Done
              </Button>
            </div>
          </Card>
          <div className="p-4">
            <label className="title-common">Add Details</label>
            <Input.TextArea
              value={
                childDrawerData.notes !== undefined && childDrawerData.notes
              }
              placeholder="Enter any specific details here"
              className="textareaPlaceholder"
              rows={3}
              onChange={onChangeInputNoteChild}
            />
          </div>
        </>
      )
    );
  }, [childDrawer, childDrawerData]);

  const showHideClearData = useCallback(() => {
    setIsModalOpen1(!isModalOpen1);
  }, [isModalOpen1]);

  const onRemoveRows = () => {
    setSurgeriesData([]);
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
      <div>
        <div className="d-flex align-items-center justify-content-between p-14-pb0">
          <div className="d-flex align-items-center">
            <img className="me-2" src={surgeryIcon} alt="surgery-icon" />
            <div className="title-common">Surgeries/Procedures</div>
          </div>

          <div className="d-flex align-items-center">
            <button
              className="btn d-flex align-items-center btn-text"
              onClick={handleDrawerTemplate}
            >
              {" "}
              <i className="icon-template me-2"></i> <span>Templates</span>
            </button>
            <Tooltip
              placement="bottom"
              title={
                surgeriesData.length > 0
                  ? ""
                  : "Please enter some Surgeries/Procedures to save a template"
              }
            >
              <button
                className="btn d-flex align-items-center btn-text"
                onClick={() => surgeriesData.length > 0 && handleDrawerSave()}
              >
                {" "}
                <i className="icon-save me-2"></i> <span>Save</span>
              </button>
            </Tooltip>
            <button
              onClick={showHideClearData}
              className="btn btn-text clear-text d-flex align-items-center"
              disabled={surgeriesData.length > 0 ? false : true}
            >
              <i className="icon-eraser1 me-2"></i> <span>Clear</span>
            </button>
          </div>
          <Drawer
            title="Surgeries/Procedures Templates"
            placement="right"
            onClose={handleDrawerTemplate}
            open={templateDrawer}
            className="modalWidth-563"
            width="auto"
          >
            {TEMPLATE_CONTENT}
          </Drawer>

          <Drawer
            title="Save Template"
            placement="right"
            onClose={handleDrawerSave}
            open={saveDrawer}
            className="modalWidth-563"
            width="auto"
          >
            {SAVE_CONTENT}
          </Drawer>
        </div>
        <div className="d-flex flex-wrap p-14-pb0">
          {TABLE_EXAMINATION}
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleDrawerChild}
            open={childDrawer}
            className="modalWidth-563"
            width="auto"
          >
            {CHILD_DRAWER_DATA}
          </Drawer>
        </div>
        <div className="p-14 py-0">
          <div
            className="inputheight38 border rounded-10px d-flex align-items-center"
            onClick={handleDrawerParent}
          >
            <i className="icon-search mx-2"></i>
            <span className="fontroboto backbar fw-normal">
              {" "}
              Search Surgeries/Procedures
            </span>
          </div>
        </div>
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleDrawerParent}
          open={parentDrawer}
          width={"100%"}
          className="searchdrawer-content"
        >
          {parentDrawer && (
            <TabSurgicalSearch
              passIndex={selectedIndex}
              onClose={handleDrawerParent}
            />
          )}
        </Drawer>
        <div
          className="d-flex flex-wrap p-14-pb0 overflow-hidden"
          style={{ maxHeight: "114px" }}
        >
          {parentOptionsList.length > 0 &&
            parentOptionsList
              .filter(
                (e) => ![...surgeriesData.map((e1) => e1.name)].includes(e.name)
              )
              .map((item, i) => {
                return (
                  <Button
                    key={i}
                    type="text"
                    style={{
                      width: item.name.length > 26 && "250px",
                    }}
                    className={`${
                      item.name.length > 26 && "chips-custom-break"
                    } btn btn-primary2 chips-custom mb-14 me-14`}
                    onClick={() => onSelectParent({ ...item })}
                  >{`${item.name}`}</Button>
                );
              })}
        </div>
        {DELETE_MODAL}
        {REMOVE_ALL_ROWS}
      </div>
    </>
  );
}

export default React.memo(TabSurgicalBox);
