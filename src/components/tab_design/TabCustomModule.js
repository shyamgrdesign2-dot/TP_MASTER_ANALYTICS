import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  Input,
  Button,
  Drawer,
  Tabs,
  Select,
  Card,
  Spin,
  Tooltip,
  Menu,
  Dropdown,
  message,
} from "antd";

import {
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import CommonModal from "../../common/CommonModal";

import CashManagerContext from "../../context/CashManagerContext";
import {
  errorMessage,
  removeBeforeWhiteSpace,
  capitalizeAfterSentence,
} from "../../utils/utils";
import { addModule, searchModule, userPreModulesRX } from "../../redux/customModuleSlice";

import TabCustomModuleSearch from "../../components/tab_design/TabCustomModuleSearch";
import { SortableContainer, SortableElement } from "react-sortable-hoc";
import { MESSAGE_KEY } from "../../utils/constants";
import { getDecodedToken } from "../../utils/localStorage";
import { ASSETS } from "../../assets";
const {
  customModule: ModuleIcon,
  editIconBlue: editIcon,
  deleteIconBlue: deleteIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
  alerticon: alertIcon,
} = ASSETS.images;

function TabCustomModule({ module }) {
  const { customModules, latestSearchedModules, loading } = useSelector(
    (state) => state.customModules
  );
  const { userId } = useSelector((state) => state.doctors);

  const dispatch = useDispatch();
  const decodedToken = getDecodedToken();

  const { customModuleContents, setCustomModuleContents, patient_data, tcmId } =
    useContext(CashManagerContext);

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
  const [isDeleteModuleModalOpen, setIsDeleteModuleModalOpen] = useState(false);

  const [inputTemplateName, setInputTemplateName] = useState(null);
  const TAB_ADD_TEMPLATE = 1;
  const TAB_UPDATE_TEMPLATE = 2;
  const ADD_EDIT_TEMPLATE_TABS = [
    { key: TAB_ADD_TEMPLATE, label: "New Template" },
    { key: TAB_UPDATE_TEMPLATE, label: "Update Template" },
  ];
  const [tabChange, setTabChange] = useState(TAB_ADD_TEMPLATE);
  const [canEditName, setCanEditName] = useState(false);
  const [newModuleName, setNewModuleName] = useState(module?.name);

  const [selectedIndex, setSelectedIndex] = useState(null);
  const templates = module?.templates;
  const moduleData =
    customModuleContents
      .filter((content) => content.module_id === module.module_id)
      ?.flatMap((item) => item.content) || [];

  useEffect(() => {
    dispatch(
      searchModule({
        moduleId: module?.module_id,
      })
    );
    setMatchedTemplates(templates);
    setAllTemplates(templates);
  }, [module]);

  const onRemoveRow = (index) => {
    const updatedModuleData = moduleData.filter((_, i) => i !== index);
    updateCustomModuleContents(updatedModuleData);
    setSelectedIndex(null);
  };

  const updateCustomModuleContents = (updatedContent) => {
    setCustomModuleContents((prevContents) => {
      const moduleExists = prevContents.some(
        (content) => content.module_id === module.module_id
      );

      return moduleExists
        ? prevContents.map((content) => {
            if (content.module_id === module.module_id) {
              return {
                ...content,
                module_name: module.name,
                content: updatedContent,
              };
            }
            return content;
          })
        : [
            ...prevContents,
            {
              module_id: module.module_id,
              module_name: module.name,
              content: updatedContent,
            },
          ];
    });
  };

  // Handle Parent Drawer
  const handleDrawerParent = useCallback(() => {
    setSelectedIndex(moduleData.length);
    setParentDrawer(!parentDrawer);
  }, [parentDrawer, moduleData]);

  const onSelectParent = useCallback(
    (e) => {
      if (!moduleData.some((item) => item.title === e)) {
        const newItem = { title: e, notes: "" };
        updateCustomModuleContents([...moduleData, newItem]);
        setSelectedIndex([...moduleData, newItem].length - 1);
        handleDrawerParent();
      }
    },
    [moduleData, selectedIndex, parentDrawer]
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
        return template.tet_template_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });
      setMatchedTemplates(filteredTemplates);
    } else {
      setMatchedTemplates(templates);
    }
  };

  const loadPreviousClick = async () => {
    const tokenData = decodedToken?.result;
    var sendData = {
      module_id: module?.module_id,
      hm_business_id: tokenData?.hospital_business_id,
      um_id: tokenData?.user_id,
      patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
      tcm_id: tcmId,
    };
    const action = await dispatch(userPreModulesRX(sendData));
    if (action.meta.requestStatus === "fulfilled") {

      const updatedData = action.payload?.moduleContents[0]?.content.map((e) => {
        return { ...e, unique_id: uuidv4(), notes: e.notes || "" };
      });
      // Find the module's existing content and update it
      const updatedModuleData = [
        ...moduleData?.filter((e) => e.title || e.notes),
        ...updatedData,
      ];
      // Update the parent state with the new module contents
      updateCustomModuleContents(updatedModuleData);

    } else {
      errorMessage(action.error)
    }
  };

  const onTemplateSelected = (template) => {
    const updatedData = template.content.map((e) => {
      return { ...e, unique_id: uuidv4(), notes: e.notes || "" };
    });

    // Find the module's existing content and update it
    const updatedModuleData = [...moduleData, ...updatedData];
    // Update the parent state with the new module contents
    updateCustomModuleContents(updatedModuleData);

    handleDrawerTemplate();
  };

  const onDeleteTemplateClicked = async (templateId) => {
    const modules = customModules.map((cm) => {
      if (cm.module_id === module.module_id) {
        return {
          ...cm,
          templates: cm.templates.filter((t) => t.template_id !== templateId),
        };
      }
      return cm;
    });
    const action = await dispatch(addModule({ userId, modules }));
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
    if (!moduleData?.some((e) => e.title || e.notes)) {
      errorMessage(`At least 1 ${module.module_name || module.name} added`);
    } else {
      const modules = customModules.map((cm) => {
        if (cm.module_id === module.module_id) {
          return {
            ...cm,
            templates: [
              {
                template_name: inputTemplateName,
                content: moduleData?.filter((e) => e.title || e.notes),
              },
              ...cm.templates,
            ],
          };
        }
        return cm;
      });
      const action = await dispatch(addModule({ userId, modules }));
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
    if (moduleData.length === 0) {
      errorMessage(`At least 1 ${module?.name} added`);
    } else if (moduleData.filter((e) => e.title == "").length > 0) {
      errorMessage(`Please fillup ${module?.name} name`);
    } else {
      let data = JSON.parse(inputTemplateName);
      const modules = customModules.map((cm) => {
        if (cm.module_id === module.module_id) {
          return {
            ...cm,
            templates: cm.templates.map((t) => {
              if (t.template_id === data.template_id) {
                return {
                  ...t,
                  template_name: data.template_name,
                  content: moduleData?.filter((e) => e.title || e.notes),
                };
              }
              return t;
            }),
          };
        }
        return cm;
      });
      const action = await dispatch(addModule({ userId, modules }));
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
                  Yes, Delete
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
          item?.title?.length > 12 && item.title?.length < 24
            ? `${item.title.length * 10.5}px`
            : item?.title?.length >= 24
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
          {item.title}
          {item.notes ? (
            <div className="text-truncate small">{item.notes}</div>
          ) : (
            <div className="text-truncate small">Add Notes</div>
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
        {items.map(
          (item, index) =>
            (item?.title || item?.notes) && (
              <SortableItem
                key={`item-${index}`}
                index={index}
                item={{ ...item, index }}
              />
            )
        )}
      </div>
    );
  });

  const TABLE_CUSTOM_MODULE = useMemo(() => {
    return (
      moduleData.length > 0 && (
        <SortableList
          items={moduleData}
          onSortEnd={({ oldIndex, newIndex }) => {
            const newModuleData = [...moduleData];
            const [movedItem] = newModuleData.splice(oldIndex, 1);
            newModuleData.splice(newIndex, 0, movedItem);
            updateCustomModuleContents(newModuleData);
          }}
          axis="xy"
          pressDelay={100}
        />
      )
    );
  }, [moduleData, childDrawerData]);

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
            {matchedTemplates?.length > 0 &&
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
                        <div className="title text-main2">
                          {template.template_name}
                        </div>
                        <div className="text-truncate">
                          {template.content.map((item, ii) => {
                            return (
                              <span key={ii}>{`${item.title || item.notes}${
                                template.content.length - 1 != ii ? ", " : ""
                              }`}</span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <Button
                      className="btn btn-delete-prescription p-0 ms-3"
                      onClick={() => showHideModal(template.template_id)}
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
              value={
                inputTemplateName &&
                JSON.parse(inputTemplateName).tet_template_name
              }
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Template"
              onSearch={onSearchTemplate}
              onSelect={onSelectTemplate}
              optionLabelProp="label"
              options={allTemplates.map((template) => {
                return {
                  key: JSON.stringify(template),
                  value: template.template_name,
                  label: (
                    <div key={template.template_id}>
                      {template.template_name}
                    </div>
                  ),
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
                      {JSON.parse(option.data.key).content.map((item, ii) => {
                        return (
                          <span key={ii}>{`${item.title}${
                            JSON.parse(option.data.key).content.length - 1 != ii
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
        notes: capitalizeAfterSentence(e.target.value),
      });
    },
    [childDrawerData]
  );

  const updateChild = (item) => {
    const { index, ...updatedReqData } = item;
    moduleData[item.index] = {
      ...moduleData[item.index],
      ...updatedReqData,
    };
    updateCustomModuleContents(moduleData);
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
                  {childDrawerData.title || "Notes"}
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
            <label className="title-common">Add Notes</label>
            <Input.TextArea
              value={
                childDrawerData.notes !== undefined && childDrawerData.notes
              }
              placeholder="Enter any specific notes here"
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
    updateCustomModuleContents([]);
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
                  Are you sure you want to Clear Selected <b>{module?.name}</b>?
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

  const toggleDeleteModuleModal = useCallback(() => {
    setIsDeleteModuleModalOpen(!isDeleteModuleModalOpen);
  }, [isDeleteModuleModalOpen]);

  const onDeleteModule = async () => {
    try {
      const moduleToDelete = customModules.find(
        (m) => m.module_id === module.module_id
      );
      const action = await dispatch(
        addModule({
          userId,
          modules: customModules.filter(
            (cm) => cm.module_id !== module.module_id
          ),
        })
      );
      if (action.meta.requestStatus === "fulfilled") {
        setCustomModuleContents((prev) => {
          return prev.filter(
            (item) => item.module_id !== moduleToDelete?.module_id
          );
        });

        message.open({
          key: MESSAGE_KEY,
          type: "",
          className: "message-appointment",
          content: (
            <div className="d-flex align-items-center">
              <img src={visitEnd} className="me-3" />
              <div>
                <div className="title-common text-start fontroboto">{`${moduleToDelete?.name} module deleted successfully.`}</div>
              </div>
              <img
                src={imgCloseVisit}
                className="ms-3"
                onClick={() => message.destroy()}
              />
            </div>
          ),
          duration: 3,
        });
      }
    } catch (error) {
      message.error(error || "Failed to delete module.");
    }
  };

  const DELETE_MODULE_MODAL = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isDeleteModuleModalOpen}
        onCancel={toggleDeleteModuleModal}
        modalWidth={500}
        title={"Are you sure you want to delete?"}
        modalBody={
          <>
            <div className="d-flex align-items-start alert-warning rounded-10px p-3 patient-details">
              <img className="me-3" src={alertIcon} alt="Warning" />
              <span>
                Deleting this "<b>{module?.name}</b>" module will permanently
                remove all saved templates and data associated with it. This
                action cannot be undone.
              </span>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={() => {
                    onDeleteModule();
                    toggleDeleteModuleModal();
                  }}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  Yes, Delete
                </div>
                <Button
                  onClick={toggleDeleteModuleModal}
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
  }, [isDeleteModuleModalOpen]);

  const menu = (
    <Menu>
      <Menu.Item
        key="edit"
        onClick={() => setCanEditName(true)}
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: "14px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#4a4a4a",
          padding: "8px 12px",
        }}
      >
        <img
          src={editIcon}
          width={16}
          height={16}
          alt="edit"
          style={{ margin: "0 8px 3px 0" }}
        />
        Edit Module Name
      </Menu.Item>
      <Menu.Item
        key="delete"
        onClick={toggleDeleteModuleModal}
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: "14px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#ff4d4f",
          padding: "8px 12px",
        }}
      >
        <img
          src={deleteIcon}
          width={16}
          height={16}
          alt="edit"
          style={{ margin: "0 8px 3px 0" }}
        />
        Delete Module
      </Menu.Item>
    </Menu>
  );

  const handleCancel = () => {
    setCanEditName(false);
    setNewModuleName(module?.name);
  };

  const handleEditModuleName = async () => {
    if (!newModuleName.trim()) {
      message.error("Module name cannot be empty.");
      return;
    }

    try {
      const action = await dispatch(
        addModule({
          userId,
          modules: customModules.map((cm) => {
            if (cm.module_id === module.module_id) {
              return {
                ...cm,
                name: newModuleName,
              };
            }
            return cm;
          }),
        })
      );
      if (action.meta.requestStatus === "fulfilled") {
        setCanEditName(false);
        message.open({
          key: MESSAGE_KEY,
          type: "",
          className: "message-appointment",
          content: (
            <div className="d-flex align-items-center">
              <img src={visitEnd} className="me-3" />
              <div>
                <div className="title-common text-start fontroboto">
                  {`Module name updated successfully.`}
                </div>
              </div>
              <img
                src={imgCloseVisit}
                className="ms-3"
                onClick={() => message.destroy()}
              />
            </div>
          ),
        });
      }
    } catch (error) {
      message.error(error || "Failed to update module name.");
    }
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between p-14-pb0">
        {canEditName ? (
          <div className="d-flex w-100">
            <img className="me-2" src={ModuleIcon} alt={module?.name} />
            <Input
              placeholder="Enter custom module name"
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              className="custom-module-input"
            />
            <>
              <CheckOutlined
                className="input-action-icon tick-icon"
                onClick={handleEditModuleName}
              />
              <CloseOutlined
                className="input-action-icon cross-icon"
                onClick={handleCancel}
              />
            </>
          </div>
        ) : (
          <>
            <div className="d-flex align-items-center">
              <img className="me-2" src={ModuleIcon} alt={module?.name} />
              <div className="title-common">{module?.name}</div>
            </div>

            <div className="d-flex align-items-center">
                <button
                  className="btn d-flex align-items-center btn-text"
                  onClick={loadPreviousClick}
                >
                  {" "}
                  <i className="icon-reload me-2"></i> <span>Load Prev. data</span>
                </button>
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
                  moduleData.length > 0
                    ? ""
                    : `Please enter some ${module?.name} to save a template`
                }
              >
                <button
                  className="btn d-flex align-items-center btn-text"
                  onClick={() => moduleData.length > 0 && handleDrawerSave()}
                >
                  {" "}
                  <i className="icon-save me-2"></i> <span>Save</span>
                </button>
              </Tooltip>
              <button
                onClick={showHideClearData}
                className="btn btn-text clear-text d-flex align-items-center"
                disabled={moduleData.length > 0 ? false : true}
              >
                <i className="icon-eraser1 me-2"></i> <span>Clear</span>
              </button>
              <Dropdown
                overlay={menu}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  icon={
                    <MoreOutlined
                      style={{ fontSize: "18px", color: "#4a4a4a" }}
                    />
                  }
                  className="more-options-btn"
                />
              </Dropdown>
            </div>
          </>
        )}
        <Drawer
          title={`${module?.name} Templates`}
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
        {TABLE_CUSTOM_MODULE}
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
            Search {module?.name}
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
          <TabCustomModuleSearch
            passIndex={selectedIndex}
            onClose={handleDrawerParent}
            module={module}
          />
        )}
      </Drawer>
      <div
        className="d-flex flex-wrap p-14-pb0 overflow-hidden"
        style={{ maxHeight: "114px" }}
      >
        {latestSearchedModules?.[module?.module_id]?.length > 0 &&
          latestSearchedModules?.[module?.module_id]
            .filter(
              (e) => ![...moduleData.map((e1) => e1.title)].includes(e?.title)
            )
            .map((item, i) => {
              return (
                <Button
                  key={i}
                  type="text"
                  style={{
                    width: item?.title.length > 26 && "250px",
                  }}
                  className={`${
                    item?.title.length > 26 && "chips-custom-break"
                  } btn btn-primary2 chips-custom mb-14 me-14`}
                  onClick={() => onSelectParent(item.title)}
                >{`${item?.title}`}</Button>
              );
            })}
      </div>
      {DELETE_MODAL}
      {REMOVE_ALL_ROWS}
      {DELETE_MODULE_MODAL}
    </div>
  );
}

export default React.memo(TabCustomModule);
