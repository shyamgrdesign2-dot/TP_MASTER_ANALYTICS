import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import {
  Input,
  Button,
  Dropdown,
  Menu,
  Tooltip,
  message,
  Popover,
  Tabs,
  Select,
  Spin,
  Drawer,
} from "antd";
import TextArea from "antd/es/input/TextArea";
import {
  InfoCircleOutlined,
  MoreOutlined,
  DeleteOutlined,
  PlusOutlined,
  LoadingOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { v4 as uuidv4 } from "uuid";
import CashManagerContext from "../../context/CashManagerContext";

import DisabledModuleTooltip from "./DisabledModuleTooltip";
import CommonModal from "../../common/CommonModal";
import { addModule, userPreModulesRX } from "../../redux/customModuleSlice";
import { customizedPad, savePrintsettings } from "../../redux/doctorsSlice";
import { removeBeforeWhiteSpace, errorMessage, getClinic } from "../../utils/utils";
import { getDecodedToken } from "../../utils/localStorage";
import { GB_VOICE_RX_NEW_UI } from "../../utils/constants";
import "./CustomModuleV2.scss";
import { isMobile } from "react-device-detect";
import CustomModuleV2Drawer from "./CustomModuleV2Drawer";
import CustomModuleFieldAutoComplete from "./CustomModuleFieldAutoComplete";
import CustomModuleFieldTextAreaAutoComplete from "./CustomModuleFieldTextAreaAutoComplete";
import EditCustomModuleDrawer from "./EditCustomModuleDrawer";
import { ASSETS } from "../../assets";
import {
  VoiceRxModuleActionButton,
  VoiceRxModuleButton,
  VoiceRxModuleCapture,
  useVoiceRxModuleCapture,
} from "../dr-agent/voicerx/VoiceRxModuleCapture";
import voiceModuleStyles from "../dr-agent/voicerx/VoiceRxModuleCapture.module.scss";
import { Grid5, Trash } from "iconsax-reactjs";
const {
  customModule: ModuleIcon,
  editIconBlue: editIcon,
  deleteIconBlue: deleteIcon,
  alerticon: alertIcon,
} = ASSETS.images;

function insertTranscriptIntoFieldValue(value, transcript, selectionStart, selectionEnd) {
  const currentValue = String(value || "");
  const nextTranscript = String(transcript || "").trim();
  if (!nextTranscript) return currentValue;

  const hasStart = Number.isInteger(selectionStart);
  const hasEnd = Number.isInteger(selectionEnd);
  const start = hasStart ? Math.max(0, Math.min(selectionStart, currentValue.length)) : currentValue.length;
  const end = hasEnd ? Math.max(start, Math.min(selectionEnd, currentValue.length)) : start;

  if (end > start || start < currentValue.length) {
    return `${currentValue.slice(0, start)}${nextTranscript}${currentValue.slice(end)}`;
  }

  return currentValue.trim() ? `${currentValue.trimEnd()}\n${nextTranscript}` : nextTranscript;
}

/**
 * CustomModuleV2 Component
 *
 * Reusable component for displaying and editing V2 custom modules
 * with dynamic fields based on module configuration.
 *
 * @param {Object} module - The module configuration
 * @param {String} module.module_id - Unique module identifier
 * @param {String} module.name - Module name
 * @param {Array} module.namedFields - Array of field configurations
 */
const CustomModuleV2 = ({ module, showVoiceRxModule }) => {
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const isVoiceRxModuleEnabled = Boolean(showVoiceRxModule) && isVoiceRxNewFromGB;
  const dispatch = useDispatch();
  const {
    userId,
    customizedPadLeftList,
    customizedPadRightList,
    defaultPrintSettings,
    profile,
  } = useSelector((state) => state.doctors);
  const { customModules, loading, hospitalSearchResults } = useSelector(
    (state) => state.customModules
  );
  const { customModuleContents, setCustomModuleContents, patient_data, tcmId, markModuleAsRemoved } =
    useContext(CashManagerContext);

  const [moduleData, setModuleData] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("add");
  const [activeRowId, setActiveRowId] = useState(null);
  const [drawerValues, setDrawerValues] = useState({});
  const [focusedFieldId, setFocusedFieldId] = useState(null); // Track which field is focused
  const [voiceTargetHighlight, setVoiceTargetHighlight] = useState(null);
  const lastVoiceTargetRef = useRef(null);

  // Templates List Popover (popOver1) / Drawer (templateDrawer)
  const [popOver1, setPopOver1] = useState(false);
  const [templateDrawer, setTemplateDrawer] = useState(false);
  const [allTemplates, setAllTemplates] = useState([]);
  const [matchedTemplates, setMatchedTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [removeTemplateId, setRemoveTemplateId] = useState(null);

  // Save Template Popover (popOver2) / Drawer (saveDrawer)
  const [popOver2, setPopOver2] = useState(false);
  const [saveDrawer, setSaveDrawer] = useState(false);
  const [inputTemplateName, setInputTemplateName] = useState(null);
  const [tabChange, setTabChange] = useState(1); // 1 = Add Template, 2 = Update Template

  // Edit Module Name (kept for backward compatibility, but will use drawer for full edit)
  const [canEditName, setCanEditName] = useState(false);
  const [newModuleName, setNewModuleName] = useState(module?.name || "");
  
  // Edit Module Drawer
  const [isEditModuleDrawerOpen, setIsEditModuleDrawerOpen] = useState(false);
  const [isDeleteConfirmationModalOpen, setIsDeleteConfirmationModalOpen] = useState(false);

  const TAB_ADD_TEMPLATE = 1;
  const TAB_UPDATE_TEMPLATE = 2;
  const ADD_EDIT_TEMPLATE_TABS = [
    { key: TAB_ADD_TEMPLATE, label: "New Template" },
    { key: TAB_UPDATE_TEMPLATE, label: "Update Template" },
  ];

  const decodedToken = getDecodedToken();
  const clinic = getClinic(profile?.hospital_data);
  const hospitalId = decodedToken?.result?.clinic_id;
  
  // Helper function to get MoEngage data
  const getMoeData = () => {
    return {
      doctor_name: profile?.um_name || "",
      doctor_um_id: userId || "",
      specialty: profile?.dp_name || "",
      doctor_mobile_no: profile?.um_contact || "",
      sub_doctor: profile?.is_sub_doctor ? 1 : 0,
      hospital_id: clinic?.hm_id || hospitalId || "",
    };
  };
  
  // Check if module is disabled (used or cloned by the user)
  const isModuleDisabled = (module.hasBeenUsed || module.hasBeenCloned || module.userId != userId || module.origin_id);
  const templates = module?.templates;

  // Resolve creator/doctor name using module itself or hospitalSearchResults fallback
  const creatorName = useMemo(() => {
    if (module?.creator_name || module?.doctor_name) {
      return module.creator_name || module.doctor_name;
    }

    const hospitalModules = hospitalSearchResults?.modules || [];
    const matched = hospitalModules.find(
      (m) => m.module_id === (module.origin_id || module.module_id)
    );

    return (
      matched?.creator_name ||
      matched?.doctor_name ||
      "Unknown"
    );
  }, [module, hospitalSearchResults]);

  // Initialize module data and templates from context
  useEffect(() => {
    const existingContent = customModuleContents.find(
      (content) => content.module_id === module.module_id
    );

    if (existingContent && existingContent.content?.length > 0) {
      // Ensure each row has a unique id - fix for case manager data
      const normalizedData = existingContent.content.map((row) => {
        // If row already has an id, use it; otherwise create a new one
        if (row.id) {
          // Ensure all named fields exist
          const normalizedRow = { ...row };
          module.namedFields?.forEach((field) => {
            if (!(field.fieldName in normalizedRow)) {
              normalizedRow[field.fieldName] = "";
            }
          });
          return normalizedRow;
        } else {
          // Create new row with id and all named fields
          const newRow = { id: uuidv4() };
          module.namedFields?.forEach((field) => {
            newRow[field.fieldName] = row[field.fieldName] || "";
          });
          return newRow;
        }
      });
      setModuleData(normalizedData);
    } else {
      // Initialize with one empty row
      const emptyRow = createEmptyRow();
      setModuleData([emptyRow]);
      updateCustomModuleContents([emptyRow]);
    }

    setAllTemplates(templates || []);
    setMatchedTemplates(templates || []);
  }, [module, customModuleContents]);

  // Create an empty row based on module's named fields
  const createEmptyRow = () => {
    const row = { id: uuidv4() };
    module.namedFields?.forEach((field) => {
      row[field.fieldName] = "";
    });
    return row;
  };

  // Update the custom module contents in context
  const updateCustomModuleContents = useCallback(
    (updatedContent) => {
      setCustomModuleContents((prevContents) => {
        const moduleExists = prevContents.some(
          (content) => content.module_id === module.module_id
        );

        if (moduleExists) {
          return prevContents.map((content) =>
            content.module_id === module.module_id
              ? {
                  ...content,
                  module_name: module.name,
                  module_version: "v2",
                  content: updatedContent,
                }
              : content
          );
        } else {
          return [
            ...prevContents,
            {
              module_id: module.module_id,
              module_name: module.name,
              module_version: "v2",
              content: updatedContent,
            },
          ];
        }
      });
    },
    [module, setCustomModuleContents]
  );

  const rememberVoiceTarget = useCallback((rowId, fieldName, selection = {}) => {
    const row = moduleData.find((item) => item.id === rowId);
    const value = String(row?.[fieldName] || "");
    const selectionStart = Number.isInteger(selection.selectionStart) ? selection.selectionStart : value.length;
    const selectionEnd = Number.isInteger(selection.selectionEnd) ? selection.selectionEnd : selectionStart;

    lastVoiceTargetRef.current = {
      rowId,
      fieldName,
      selectionStart,
      selectionEnd,
    };
    setVoiceTargetHighlight({ rowId, fieldName });
  }, [moduleData]);

  const resolveVoiceTarget = useCallback((rows) => {
    const fieldNames = module.namedFields?.map((field) => field.fieldName).filter(Boolean) || [];
    const lastTarget = lastVoiceTargetRef.current;
    if (
      lastTarget &&
      fieldNames.includes(lastTarget.fieldName) &&
      rows.some((row) => row.id === lastTarget.rowId)
    ) {
      return lastTarget;
    }

    for (const row of rows) {
      for (const fieldName of fieldNames) {
        if (!String(row?.[fieldName] || "").trim()) {
          return { rowId: row.id, fieldName, selectionStart: 0, selectionEnd: 0 };
        }
      }
    }

    const fallbackRow = rows[rows.length - 1];
    const fallbackFieldName = fieldNames[0];
    return {
      rowId: fallbackRow?.id,
      fieldName: fallbackFieldName,
      selectionStart: String(fallbackRow?.[fallbackFieldName] || "").length,
      selectionEnd: String(fallbackRow?.[fallbackFieldName] || "").length,
    };
  }, [module.namedFields]);

  const applyVoiceTranscriptToFocusedField = useCallback((transcript) => {
    const cleanTranscript = String(transcript || "").trim();
    const fieldNames = module.namedFields?.map((field) => field.fieldName).filter(Boolean) || [];
    if (!cleanTranscript || fieldNames.length === 0) return;

    const nextModuleData = moduleData.length ? moduleData.map((row) => ({ ...row })) : [createEmptyRow()];
    const target = resolveVoiceTarget(nextModuleData);
    if (!target?.fieldName) return;

    const targetRowIndex = nextModuleData.findIndex((row) => row.id === target.rowId);
    const rowIndex = targetRowIndex >= 0 ? targetRowIndex : nextModuleData.length - 1;
    nextModuleData[rowIndex] = {
      ...nextModuleData[rowIndex],
      [target.fieldName]: insertTranscriptIntoFieldValue(
        nextModuleData[rowIndex]?.[target.fieldName],
        cleanTranscript,
        target.selectionStart,
        target.selectionEnd
      ),
    };

    setModuleData(nextModuleData);
    updateCustomModuleContents(nextModuleData);
    setHasChanges(true);
  }, [createEmptyRow, module.namedFields, moduleData, resolveVoiceTarget, updateCustomModuleContents]);

  const copyPayloadMatchesThisModule = useCallback((payload = {}) => {
    const targetedModuleId = payload.sideNavCustomModuleTargetId || payload.digitization?.sideNavCustomModuleTargetId;
    if (targetedModuleId) {
      return String(targetedModuleId) === String(module?.module_id);
    }
    const digitization = payload.digitization || {};
    const copiedModules = [
      ...(Array.isArray(payload.moduleContents) ? payload.moduleContents : []),
      ...(Array.isArray(payload.module_contents) ? payload.module_contents : []),
      ...(Array.isArray(digitization.moduleContents) ? digitization.moduleContents : []),
      ...(Array.isArray(digitization.module_contents) ? digitization.module_contents : []),
    ];
    return copiedModules.some((copiedModule) => (
      String(copiedModule?.module_id) === String(module?.module_id)
    ));
  }, [module?.module_id]);

  const {
    voiceCaptureOpen,
    setVoiceCaptureOpen,
    voiceUpdated,
    handleVoiceCaptureComplete,
    sectionRef,
  } = useVoiceRxModuleCapture({
    moduleName: module?.name || "Custom Module",
    onTranscriptionApply: applyVoiceTranscriptToFocusedField,
    transcriptionSuccessMessage: "Transcript added from voice dictation",
    copyPayloadMatcher: copyPayloadMatchesThisModule,
  });

  const isVoiceTargetHighlighted = useCallback((rowId, fieldName) => (
    voiceCaptureOpen &&
    voiceTargetHighlight?.rowId === rowId &&
    voiceTargetHighlight?.fieldName === fieldName
  ), [voiceCaptureOpen, voiceTargetHighlight]);

  // Handle field value change
  const handleFieldChange = (rowId, fieldName, value) => {
    // Ensure rowId exists and is valid
    if (!rowId) {
      console.warn("handleFieldChange: rowId is missing");
      return;
    }
    
    const updatedData = moduleData.map((row) => {
      // Use strict equality and ensure we're matching the correct row
      if (row.id === rowId) {
        return { ...row, [fieldName]: value };
      }
      return row; // Return unchanged row
    });
    
    setModuleData(updatedData);
    updateCustomModuleContents(updatedData);
    setHasChanges(true);
  };

  // Handle adding a new row
  const handleAddRow = () => {
    if (isMobile) {
      const newRow = createEmptyRow();
      const { id, ...rest } = newRow;
      setDrawerMode("add");
      setActiveRowId(null);
      setDrawerValues(rest);
      setDrawerOpen(true);
      return;
    }

    const newRow = createEmptyRow();
    const updatedData = [...moduleData, newRow];
    setModuleData(updatedData);
    updateCustomModuleContents(updatedData);
    setHasChanges(true);
  };

  // Handle deleting a row
  const handleDeleteRow = (rowId) => {
    if (moduleData.length === 1) {
      message.warning("At least one row is required");
      return;
    }

    const updatedData = moduleData.filter((row) => row.id !== rowId);
    setModuleData(updatedData);
    updateCustomModuleContents(updatedData);
    setHasChanges(false);
    message.success("Row deleted successfully");
  };

  // Handle save (just shows a message, data is already saved in context)
  const handleSave = () => {
    // Filter out empty rows
    const nonEmptyData = moduleData.filter((row) => {
      return module.namedFields?.some(
        (field) => row[field.fieldName]?.trim().length > 0
      );
    });

    if (nonEmptyData.length === 0) {
      message.warning("Please add at least one entry before saving");
      return;
    }

    // Data is already in context from handleFieldChange, just confirm
    setHasChanges(false);
    message.success("Module data saved successfully");
  };

  // Handle clear
  const handleClear = () => {
    const emptyRow = createEmptyRow();
    setModuleData([emptyRow]);
    updateCustomModuleContents([emptyRow]);
    setHasChanges(false);
    message.success("Module data cleared");
  };

  // Templates List Popover/Drawer functions
  const showHideTemplatesListPopover = useCallback(() => {
    if (isMobile) {
      setTemplateDrawer(!templateDrawer);
    } else {
      setPopOver1(!popOver1);
    }
  }, [popOver1, templateDrawer, isMobile]);

  const handleDrawerTemplate = useCallback(() => {
    setTemplateDrawer(!templateDrawer);
  }, [templateDrawer]);

  const onSearch = (e) => {
    const searchQuery = e.target.value;
    if (searchQuery) {
      let filteredTemplates = (templates || []).filter((template) => {
        return template.template_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });
      setMatchedTemplates(filteredTemplates);
    } else {
      setMatchedTemplates(templates || []);
    }
  };

  const loadPreviousClick = async () => {
    const tokenData = decodedToken?.result;
    var sendData = {
      module_id: `${module?.module_id}`,
      hm_business_id: `${tokenData?.hospital_business_id}`,
      um_id: `${tokenData?.user_id}`,
      patient_unique_id:
        patient_data !== undefined ? `${patient_data.patient_unique_id}` : "0",
      tcm_id: `${tcmId}` ,
    };
    const action = await dispatch(userPreModulesRX(sendData));
    if (action.meta.requestStatus === "fulfilled") {
      const prevContent = action.payload?.moduleContents[0]?.content || [];

      // Map previous content and ensure all named fields exist
      const updatedData = prevContent
        .map((item) => {
          // Check if this item has any actual content
          const hasContent = module.namedFields?.some(
            (field) => item[field.fieldName]?.trim?.().length > 0
          );

          // Skip empty items
          if (!hasContent) {
            return null;
          }

          // Create a new row with id and all named fields
          const row = { id: uuidv4() };
          module.namedFields?.forEach((field) => {
            row[field.fieldName] = item[field.fieldName] || "";
          });
          return row;
        })
        .filter(Boolean); // Remove null entries

      // If no previous data found, show message
      if (updatedData.length === 0) {
        message.info("No previous data found");
        return;
      }

      // Merge with existing content
      const updatedModuleData = [
        ...moduleData?.filter((row) => {
          return module.namedFields?.some(
            (field) => row[field.fieldName]?.trim().length > 0
          );
        }),
        ...updatedData,
      ];
      setModuleData(updatedModuleData);
      updateCustomModuleContents(updatedModuleData);
      message.success("Previous data loaded successfully");
    } else {
      errorMessage(action.error);
    }
  };

  const onTemplateSelected = (template) => {
    // Map template content and ensure all named fields exist
    const updatedData = template.content
      .map((item) => {
        // Check if this item has any actual content
        const hasContent = module.namedFields?.some(
          (field) => item[field.fieldName]?.trim?.().length > 0
        );

        // Skip empty items
        if (!hasContent) {
          return null;
        }

        // Create a new row with id and all named fields
        const row = { id: uuidv4() };
        module.namedFields?.forEach((field) => {
          row[field.fieldName] = item[field.fieldName] || "";
        });
        return row;
      })
      .filter(Boolean); // Remove null entries

    // If no valid data in template, show warning
    if (updatedData.length === 0) {
      message.warning("This template has no data");
      showHideTemplatesListPopover();
      return;
    }

    // Merge with existing content (preserve existing non-empty rows)
    const updatedModuleData = [
      ...moduleData?.filter((row) => {
        return module.namedFields?.some(
          (field) => row[field.fieldName]?.trim().length > 0
        );
      }),
      ...updatedData,
    ];
    setModuleData(updatedModuleData);
    updateCustomModuleContents(updatedModuleData);

    // Close the template popover
    showHideTemplatesListPopover();
    message.success("Template loaded successfully");
  };

  const onDeleteTemplateClicked = async (templateId) => {
    const modules = customModules.map((cm) => {
      if (cm.module_id === module.module_id) {
        return {
          ...cm,
          templates: (cm.templates || []).filter(
            (t) => t.template_id !== templateId
          ),
        };
      }
      return cm;
    });
    const action = await dispatch(addModule({ userId, modules }));
    if (action.meta.requestStatus === "fulfilled") {
      message.success("Template deleted successfully");
    } else {
      errorMessage(action.error);
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

  // Save template functions
  const showHideSaveTemplatePopOver = useCallback(() => {
    setInputTemplateName(null);
    if (isMobile) {
      setSaveDrawer(!saveDrawer);
    } else {
      setPopOver2(!popOver2);
    }
  }, [popOver2, saveDrawer, isMobile]);

  const handleSaveTemplateDrawer = useCallback(() => {
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

  const onChangeSaveTemplate = useCallback(
    (e) => {
      const updateQuery = removeBeforeWhiteSpace(e.target.value);
      setInputTemplateName(updateQuery);
    },
    [inputTemplateName]
  );

  const onAddTemplateClicked = async () => {
    // Filter out empty rows
    const nonEmptyData = moduleData.filter((row) => {
      return module.namedFields?.some(
        (field) => row[field.fieldName]?.trim().length > 0
      );
    });

    if (!nonEmptyData || nonEmptyData.length === 0) {
      errorMessage(`At least 1 ${module.name} should be added`);
    } else {
      // Strip the 'id' field from content before saving
      const contentToSave = nonEmptyData.map((row) => {
        const { id, ...rest } = row;
        return rest;
      });

      const modules = customModules.map((cm) => {
        if (cm.module_id === module.module_id) {
          return {
            ...cm,
            templates: [
              {
                template_name: inputTemplateName,
                content: contentToSave,
              },
              ...(cm.templates || []),
            ],
          };
        }
        return cm;
      });
      const action = await dispatch(addModule({ userId, modules }));
      if (action.meta.requestStatus === "fulfilled") {
        setInputTemplateName(null);
        showHideSaveTemplatePopOver();
        message.success("Template saved successfully");
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
    // Filter out empty rows
    const nonEmptyData = moduleData.filter((row) => {
      return module.namedFields?.some(
        (field) => row[field.fieldName]?.trim().length > 0
      );
    });

    if (nonEmptyData.length === 0) {
      errorMessage(`At least 1 ${module?.name} added`);
    } else {
      // Strip the 'id' field from content before saving
      const contentToSave = nonEmptyData.map((row) => {
        const { id, ...rest } = row;
        return rest;
      });

      let data = JSON.parse(inputTemplateName);
      const modules = customModules.map((cm) => {
        if (cm.module_id === module.module_id) {
          return {
            ...cm,
            templates: (cm.templates || []).map((t) => {
              if (t.template_id === data.template_id) {
                return {
                  ...t,
                  template_name: data.template_name,
                  content: contentToSave,
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
        showHideSaveTemplatePopOver();
        message.success("Template updated successfully");
      }
    }
  };

  // Handle delete module confirmation
  const handleDeleteModuleClick = () => {
    setIsDeleteConfirmationModalOpen(true);
  };

  // Handle delete module
  const handleDeleteModule = async () => {
    // Track MoEngage event for delete module
    if (window.Moengage) {
      window.Moengage.track_event("TP_CMV2_Del", getMoeData());
    }
    
    try {
      message.loading({ content: "Deleting module...", key: "deleteModule" });

      // Step 1: Remove module from user modules
      const modules = customModules.filter(
        (cm) => cm.module_id !== module.module_id
      );
      const action = await dispatch(addModule({ userId, modules }));

      if (action.meta.requestStatus === "fulfilled") {
        // Step 2: Remove from print settings
        if (defaultPrintSettings?.prescription?.case_option) {
          const caseOptions = defaultPrintSettings.prescription.case_option;

          const updatedCaseOptions = caseOptions.filter(
            (option) =>
              !(option.id === module.module_id && option.is_custom_module)
          );

          const rxPrescription = {
            ...defaultPrintSettings.prescription,
            case_option: updatedCaseOptions,
          };

          const printSettingsData = {
            ...defaultPrintSettings,
            prescription: JSON.stringify(rxPrescription),
            header_footer: JSON.stringify(defaultPrintSettings.header_footer),
            page_format: JSON.stringify(defaultPrintSettings.page_format),
          };

          await dispatch(savePrintsettings(printSettingsData)).unwrap();
        }

        // Step 3: Remove from customized pad
        const updatedRightPad = customizedPadRightList.filter(
          (item) => item.tmdpm_id !== module.module_id
        );

        const sendData = {
          data: {
            default: false,
            reset: false,
            left: customizedPadLeftList,
            right: updatedRightPad,
          },
        };

        await dispatch(customizedPad(sendData)).unwrap();

        // Step 4: Remove from customModuleContents if present
        const updatedContents = customModuleContents.filter(
          (mc) => mc.module_id !== module.module_id
        );
        setCustomModuleContents(updatedContents);

        setIsDeleteConfirmationModalOpen(false);

        message.success({
          content: `Module "${module.name}" deleted successfully`,
          key: "deleteModule",
          duration: 3,
        });
      } else {
        message.error({
          content: "Failed to delete module",
          key: "deleteModule",
          duration: 3,
        });
      }
    } catch (error) {
      console.error("Error deleting module:", error);
      message.error({
        content: "Failed to delete module. Please try again.",
        key: "deleteModule",
        duration: 3,
      });
    }
  };

  const handleDeleteConfirmationModal = () => {
    setIsDeleteConfirmationModalOpen(false);
  };

  // Handle edit row
  const handleEditRow = (rowId) => {
    if (!isMobile) {
      return;
    }

    const rowToEdit = moduleData.find((row) => row.id === rowId);
    if (rowToEdit) {
      const { id, ...rest } = rowToEdit;
      setDrawerMode("edit");
      setActiveRowId(rowId);
      setDrawerValues(rest);
      setDrawerOpen(true);
    }
  };

  const handleDrawerFieldChange = (fieldName, value) => {
    setDrawerValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveRowId(null);
  };

  const handleDrawerSave = () => {
    const normalizedRow = {};
    module.namedFields?.forEach((field) => {
      normalizedRow[field.fieldName] = drawerValues[field.fieldName] || "";
    });

    let updatedData = [];
    if (drawerMode === "edit" && activeRowId) {
      updatedData = moduleData.map((row) =>
        row.id === activeRowId ? { ...row, ...normalizedRow } : row
      );
    } else {
      const newRow = { id: uuidv4(), ...normalizedRow };
      updatedData = [...moduleData, newRow];
    }

    setModuleData(updatedData);
    updateCustomModuleContents(updatedData);
    setHasChanges(true);
    closeDrawer();
  };

  // Handle remove module from Rx pad
  const handleRemoveFromRxPad = async () => {
    // Track MoEngage event for remove from Rx pad
    if (window.Moengage) {
      window.Moengage.track_event("TP_CMV2_Remove", getMoeData());
    }
    
    try {
      message.loading({
        content: "Removing module from Rx pad...",
        key: "removeFromRx",
      });

      // // Step 1: Remove from print settings
      // if (defaultPrintSettings?.prescription?.case_option) {
      //   const caseOptions = defaultPrintSettings.prescription.case_option;

      //   // Filter out the current module from case_option
      //   const updatedCaseOptions = caseOptions.filter(
      //     (option) =>
      //       !(option.id === module.module_id && option.is_custom_module)
      //   );

      //   const rxPrescription = {
      //     ...defaultPrintSettings.prescription,
      //     case_option: updatedCaseOptions,
      //   };

      //   const printSettingsData = {
      //     ...defaultPrintSettings,
      //     prescription: JSON.stringify(rxPrescription),
      //     header_footer: JSON.stringify(defaultPrintSettings.header_footer),
      //     page_format: JSON.stringify(defaultPrintSettings.page_format),
      //   };

      //   await dispatch(savePrintsettings(printSettingsData)).unwrap();
      // }

      // Step 2: Remove from customized pad right list
      const updatedRightList = customizedPadRightList.filter(
        (item) => item.tmdpm_id !== module.module_id
      );

      const sendData = {
        data: {
          default: false,
          reset: false,
          left: customizedPadLeftList, // Keep left side as-is
          right: updatedRightList, // Remove module from right side
        },
      };

      await dispatch(customizedPad(sendData)).unwrap();

      // Step 3: Remove from customModuleContents if present
      const updatedContents = customModuleContents.filter(
        (mc) => mc.module_id !== module.module_id
      );
      setCustomModuleContents(updatedContents);

      // Step 4: Mark module as removed to prevent re-adding from caseManagerData
      if (markModuleAsRemoved) {
        markModuleAsRemoved(module.module_id);
      }

      message.success({
        content: `"${module.name}" removed from Rx pad successfully`,
        key: "removeFromRx",
        duration: 3,
      });
    } catch (error) {
      console.error("Error removing module from Rx pad:", error);
      message.error({
        content:
          error?.message ||
          "Failed to remove module from Rx pad. Please try again.",
        key: "removeFromRx",
        duration: 3,
      });
    }
  };

  // Handle edit module name
  const handleEditModuleName = async () => {
    if (!newModuleName.trim()) {
      message.error("Module name cannot be empty.");
      return;
    }
    if (
      customModules.some(
        (cm) =>
          cm.module_id !== module.module_id && cm.name === newModuleName.trim()
      )
    ) {
      message.error("Module name already exists.");
      return;
    }

    try {
      message.loading({
        content: "Updating module name...",
        key: "editModule",
      });

      // Step 1: Update module name in user modules
      const action = await dispatch(
        addModule({
          userId,
          modules: customModules.map((cm) => {
            if (cm.module_id === module.module_id) {
              return {
                ...cm,
                name: newModuleName.trim(),
              };
            }
            return cm;
          }),
        })
      );

      if (action.meta.requestStatus === "fulfilled") {
        // Step 2: Update module name in print settings
        if (defaultPrintSettings?.prescription?.case_option) {
          const caseOptions = defaultPrintSettings.prescription.case_option;

          const updatedCaseOptions = caseOptions.map((option) => {
            if (option.id === module.module_id && option.is_custom_module) {
              return {
                ...option,
                title: newModuleName.trim(),
              };
            }
            return option;
          });

          const rxPrescription = {
            ...defaultPrintSettings.prescription,
            case_option: updatedCaseOptions,
          };

          const printSettingsData = {
            ...defaultPrintSettings,
            prescription: JSON.stringify(rxPrescription),
            header_footer: JSON.stringify(defaultPrintSettings.header_footer),
            page_format: JSON.stringify(defaultPrintSettings.page_format),
          };

          await dispatch(savePrintsettings(printSettingsData)).unwrap();
        }

        // Step 3: Update module name in customized pad
        const updatedRightPad = customizedPadRightList.map((item) => {
          if (item.tmdpm_id === module.module_id && item.is_custom_module) {
            return {
              ...item,
              tmdpm_name: newModuleName.trim(),
              tmdpm_short_name: newModuleName.trim(),
            };
          }
          return item;
        });

        const sendData = {
          data: {
            default: false,
            reset: false,
            left: customizedPadLeftList,
            right: updatedRightPad,
          },
        };

        await dispatch(customizedPad(sendData)).unwrap();

        setCanEditName(false);
        message.success({
          content: "Module name updated successfully",
          key: "editModule",
          duration: 3,
        });
      }
    } catch (error) {
      console.error("Error updating module name:", error);
      message.error({
        content: error?.message || "Failed to update module name.",
        key: "editModule",
        duration: 3,
      });
    }
  };

  // Handle cancel edit module name
  const handleCancel = () => {
    setCanEditName(false);
    setNewModuleName(module?.name || "");
  };

  // More options menu
  const moreMenu = (
    <Menu>
      <Menu.Item
        key="remove"
        onClick={handleRemoveFromRxPad}
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
        <i className="icon-exit color-blue" style={{ margin: "0 4px 3px 0" }}></i>
          Remove From Rx Pad
      </Menu.Item>
      <Menu.Item
        key="edit"
        onClick={isModuleDisabled ? undefined : () => {
          // Track MoEngage event for edit module
          if (window.Moengage) {
            window.Moengage.track_event("TP_CM2_Edit", getMoeData());
          }
          setIsEditModuleDrawerOpen(true);
        }}
        disabled={isModuleDisabled}
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: "14px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: isModuleDisabled ? "#a2a2a8" : "#4a4a4a",
          padding: "8px 12px",
          cursor: isModuleDisabled ? "not-allowed" : "pointer",
          opacity: isModuleDisabled ? 0.6 : 1,
        }}
      >
        {isModuleDisabled ? (
          <DisabledModuleTooltip
            module={module}
            hospitalSearchResults={hospitalSearchResults}
          >
            <span style={{ display: "flex", alignItems: "center" }}>
              <img
                src={editIcon}
                width={18}
                height={18}
                alt="edit"
                style={{ margin: "0 8px 3px 0" }}
              />
              Edit Module
            </span>
          </DisabledModuleTooltip>
        ) : (
          <>
            <img
              src={editIcon}
              width={18}
              height={18}
              alt="edit"
              style={{ margin: "0 8px 3px 0" }}
            />
            Edit Module
          </>
        )}
      </Menu.Item>
      <Menu.Item
        key="delete"
        onClick={isModuleDisabled ? undefined : handleDeleteModuleClick}
        disabled={isModuleDisabled}
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: "14px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: isModuleDisabled ? "#a2a2a8" : "#ff4d4f",
          padding: "8px 12px",
          cursor: isModuleDisabled ? "not-allowed" : "pointer",
          opacity: isModuleDisabled ? 0.6 : 1,
        }}
      >
        {isModuleDisabled ? (
          <DisabledModuleTooltip
            module={module}
            hospitalSearchResults={hospitalSearchResults}
          >
            <span style={{ display: "flex", alignItems: "center" }}>
              <img
                src={deleteIcon}
                width={18}
                height={18}
                alt="delete"
                style={{ margin: "0 8px 3px 0" }}
              />
              Delete Module
            </span>
          </DisabledModuleTooltip>
        ) : (
          <>
            <img
              src={deleteIcon}
              width={18}
              height={18}
              alt="delete"
              style={{ margin: "0 8px 3px 0" }}
            />
            Delete Module
          </>
        )}
      </Menu.Item>
    </Menu>
  );

  // Template List Content Component
  const TEMPLATE_CONTENT = useCallback(() => {
    return (
      <>
        <div
          className={`${isMobile ? "medicine-templates" : "pop-header"}`}
          key={`${module.name}-template`}
        >
          {!isMobile && (
            <div className="align-items-center d-flex justify-content-between">
              <div className="title-common">{module?.name} Templates</div>
              <Button
                className="btn btn-delete-prescription p-0"
                onClick={showHideTemplatesListPopover}
              >
                <i className="icon-Cross" />
              </Button>
            </div>
          )}
          <div
            className={`${!isMobile && "mt-3"}`}
            key={`${module.name}-template-search`}
          >
            <Input
              allowClear
              className="popinput"
              onChange={onSearch}
              placeholder="Search Templates"
              prefix={<i className="icon-search me-2" />}
            />
          </div>
        </div>
        <div className={`${isMobile ? "tab-template-height" : "pop-body"}`}>
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
                    <div className="title text-main2">
                      {template.template_name}
                    </div>
                    <div className="text-truncate">
                      {template?.content?.map((item, ii) => {
                        // Get all field values from the item
                        const fieldValues = module.namedFields
                          ?.map((field) => item[field.fieldName])
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <span key={ii}>{`${fieldValues}${
                            template.content.length - 1 != ii ? ", " : ""
                          }`}</span>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    className="btn btn-delete-prescription p-0 ms-2"
                    onClick={() => {
                      showHideModal(template.template_id);
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
  }, [popOver1, matchedTemplates, module]);

  // Delete Template Modal
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
  }, [isModalOpen, removeTemplateId]);

  // Save Content Component
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
          {!isMobile && (
            <Button
              className="btn btn-delete-prescription"
              onClick={showHideSaveTemplatePopOver}
            >
              <i className="icon-Cross"></i>
            </Button>
          )}
        </div>
        {tabChange === TAB_ADD_TEMPLATE ? (
          <div
            className={`pop-header d-flex ${
              isMobile ? "medicine-templates" : ""
            }`}
          >
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
          <div
            className={`pop-header d-flex ${
              isMobile ? "medicine-templates" : ""
            }`}
          >
            <Select
              showSearch
              value={
                inputTemplateName && JSON.parse(inputTemplateName).template_name
              }
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Template"
              onSearch={onSearchTemplate}
              onSelect={onSelectTemplate}
              optionLabelProp="label"
              options={(allTemplates || []).map((template) => {
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
                    {isVoiceRxModuleEnabled ? <Grid5 color="#4C4E5C" size={18} strokeWidth={1.6} variant="Linear" /> : <i className="icon-template"></i>}
                  </div>
                  <div className="text-truncate w-100">
                    <div className="title text-main2">{option.data.value}</div>
                    <div className="text-truncate">
                      {JSON.parse(option.data.key).content.map((item, ii) => {
                        const fieldValues = module.namedFields
                          ?.map((field) => item[field.fieldName])
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <span key={ii}>{`${fieldValues}${
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
  }, [
    tabChange,
    popOver2,
    inputTemplateName,
    loading,
    allTemplates,
    moduleData,
  ]);

  // Determine the number of columns for grid layout
  const columnCount = module.namedFields?.length || 2;
  const columnClass =
    columnCount === 1
      ? "custom-module-v2--1-cols"
      : columnCount > 2
      ? `custom-module-v2--${columnCount}-cols`
      : "";

  // Check if there's any data to save
  const hasDataToSave = useMemo(() => {
    return (
      moduleData?.filter((row) => {
        return module.namedFields?.some(
          (field) => row[field.fieldName]?.trim().length > 0
        );
      }).length > 0
    );
  }, [moduleData, module.namedFields]);

  // Delete Confirmation Modal
  const DELETE_CONFIRMATION_MODAL = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isDeleteConfirmationModalOpen}
        modalWidth={610}
        title={"Are you sure you want to delete?"}
        onCancel={handleDeleteConfirmationModal}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  Deleting this "<b>{module?.name}</b>" module will permanently
                  remove all saved templates and data associated with it. This
                  action cannot be undone.
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={() => {
                    handleDeleteModule();
                  }}
                  className="me-4 text-decoration-underline btn p-0"
                  style={{ color: "#ff4d4f", cursor: "pointer" }}
                >
                  Yes, Delete
                </div>
                <Button
                  onClick={handleDeleteConfirmationModal}
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
  }, [isDeleteConfirmationModalOpen, module, handleDeleteConfirmationModal, handleDeleteModule]);

  // Close dropdown when clicking outside the module or on a different module
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside a dropdown - if so, don't close
      if (event.target.closest('.custom-module-dropdown')) {
        return;
      }
      
      // Check if click is inside this module
      const clickedModule = event.target.closest('.prescription-box-sm');
      const currentModuleId = module?.module_id;
      
      // If click is outside any module or on a different module, close dropdowns
      if (!clickedModule || clickedModule.getAttribute('data-module-id') !== String(currentModuleId)) {
        setFocusedFieldId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [module?.module_id]);

  const voiceDictationTargetId = `custom-module-${module?.module_id || module?.name || "v2"}`;
  const activeDropdownFieldId = focusedFieldId;

  return (
    <div
      ref={sectionRef}
      data-voice-rx-dictation-target={voiceDictationTargetId}
      className={[
        "prescription-box-sm",
        activeDropdownFieldId ? "custom-module-v2--dropdown-open" : "",
        voiceModuleStyles.moduleRoot,
        isVoiceRxModuleEnabled && voiceCaptureOpen ? voiceModuleStyles.moduleCaptureLocked : "",
        voiceUpdated ? voiceModuleStyles.moduleUpdated : "",
      ].filter(Boolean).join(" ")}
      data-module-id={module?.module_id}
    >
      {/* Header */}
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
              <div className="title-common d-flex align-items-center">
                {module?.name}
                <DisabledModuleTooltip
                  module={module}
                  hospitalSearchResults={hospitalSearchResults}
                  placement="bottom"
                  type="title"
                >
                  <InfoCircleOutlined
                    style={{ marginLeft: 8, color: "#a1a1aa", fontSize: 16 }}
                  />
                </DisabledModuleTooltip>
              </div>
            </div>

            <div className="d-flex align-items-center">
              {isVoiceRxModuleEnabled && (
                <VoiceRxModuleButton
                  active={voiceCaptureOpen}
                  dictationTargetId={voiceDictationTargetId}
                  label={`Start ${module?.name || "Custom Module"} voice input`}
                  onClick={() => setVoiceCaptureOpen(true)} />
              )}
              {isVoiceRxModuleEnabled ? (
                <Tooltip placement="bottom" title="Load previous data">
                  <VoiceRxModuleActionButton type="reload" label="Load previous data" onClick={loadPreviousClick} />
                </Tooltip>
              ) : (
                <button
                  className="btn d-flex align-items-center btn-text"
                  onClick={loadPreviousClick}
                >
                  <i className="icon-reload me-2"></i>
                  <span>Load Prev. data</span>
                </button>
              )}
              {isVoiceRxModuleEnabled ? (
                isMobile ? (
                  <Tooltip placement="bottom" title={`Browse ${module?.name || "module"} templates`}>
                    <VoiceRxModuleActionButton
                      type="template"
                      label={`Browse ${module?.name || "module"} templates`}
                      onClick={handleDrawerTemplate}
                    />
                  </Tooltip>
                ) : (
                  <Popover
                    open={popOver1}
                    onOpenChange={showHideTemplatesListPopover}
                    content={TEMPLATE_CONTENT}
                    trigger="click"
                    overlayClassName="pop-350 pp-0"
                    placement="bottom"
                  >
                    <span>
                      <Tooltip placement="bottom" title={`Browse ${module?.name || "module"} templates`}>
                        <VoiceRxModuleActionButton type="template" label={`Browse ${module?.name || "module"} templates`} />
                      </Tooltip>
                    </span>
                  </Popover>
                )
              ) : isMobile ? (
                <button
                  className="btn d-flex align-items-center btn-text"
                  onClick={handleDrawerTemplate}
                >
                  <i className="icon-template me-2"></i> <span>Templates</span>
                </button>
              ) : (
                <Popover
                  open={popOver1}
                  onOpenChange={showHideTemplatesListPopover}
                  content={TEMPLATE_CONTENT}
                  trigger="click"
                  overlayClassName="pop-350 pp-0"
                  placement="bottom"
                >
                  <button className="btn d-flex align-items-center btn-text">
                    <i className="icon-template me-2"></i>{" "}
                    <span>Templates</span>
                  </button>
                </Popover>
              )}
              <Tooltip
                placement="bottom"
                title={
                  hasDataToSave
                    ? ""
                    : `Please enter some ${module?.name} to save a template`
                }
              >
                {isVoiceRxModuleEnabled ? (
                  isMobile ? (
                    <VoiceRxModuleActionButton
                      type="save"
                      label={`Save ${module?.name || "module"} as template`}
                      onClick={() => hasDataToSave && handleSaveTemplateDrawer()}
                      disabled={!hasDataToSave}
                    />
                  ) : (
                    <Popover
                      open={popOver2}
                      onOpenChange={() =>
                        hasDataToSave && showHideSaveTemplatePopOver()
                      }
                      content={SAVE_CONTENT}
                      trigger="click"
                      overlayClassName="pop-450 pp-0"
                      placement="bottom"
                    >
                      <span>
                        <VoiceRxModuleActionButton
                          type="save"
                          label={`Save ${module?.name || "module"} as template`}
                          disabled={!hasDataToSave}
                        />
                      </span>
                    </Popover>
                  )
                ) : isMobile ? (
                  <button
                    className="btn d-flex align-items-center btn-text"
                    style= {{border: "none"}}
                    onClick={() => hasDataToSave && handleSaveTemplateDrawer()}
                    disabled={!hasDataToSave}
                  >
                    <i className="icon-save me-2"></i> <span>Save</span>
                  </button>
                ) : (
                  <Popover
                    open={popOver2}
                    onOpenChange={() =>
                      hasDataToSave && showHideSaveTemplatePopOver()
                    }
                    content={SAVE_CONTENT}
                    trigger="click"
                    overlayClassName="pop-450 pp-0"
                    placement="bottom"
                  >
                    <button className="btn d-flex align-items-center btn-text">
                      {" "}
                      <i className="icon-save me-2"></i> <span>Save</span>
                    </button>
                  </Popover>
                )}
              </Tooltip>
              {isVoiceRxModuleEnabled ? (
                <Tooltip placement="bottom" title="Clear this section">
                  <VoiceRxModuleActionButton
                    type="clear"
                    label={`Clear ${module?.name || "module"}`}
                    onClick={handleClear}
                    disabled={!hasDataToSave}
                  />
                </Tooltip>
              ) : (
                <button
                  onClick={handleClear}
                  className="btn btn-text clear-text d-flex align-items-center"
                  disabled={!hasDataToSave}
                >
                  <i className="icon-eraser1 me-2"></i> <span>Clear</span>
                </button>
              )}
              <Dropdown
                overlay={moreMenu}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  icon={
                    <MoreOutlined
                      style={{
                        fontSize: "18px",
                        color: "#4a4a4a",
                        fontWeight: "bold",
                      }}
                    />
                  }
                  className="more-options-btn"
                />
              </Dropdown>
            </div>
          </>
        )}
      </div>

      {/* Delete Template Modal */}
      {DELETE_MODAL}

      {/* Table */}
      <table className={`custom-module-v2__table ${columnClass} mt-14`}>
        {/* Table Header */}
        <thead>
          <tr className="border-top border-bottom">
            {module.namedFields?.map((field, index) => (
              <th
                key={field.fieldName}
                className="custom-module-v2__table-header-cell"
              >
                {field.fieldLabel ?? field.fieldName}
              </th>
            ))}
            <th className="custom-module-v2__table-header-cell custom-module-v2__table-header-cell--action">
              {/* Action column header */}
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {moduleData.map((row, rowIndex) => {
            // Ensure row has an id - fallback to index if missing (shouldn't happen but safety check)
            const rowKey = row.id || `row-${rowIndex}-${module.module_id}`;
            const isActiveDropdownRow = module.namedFields?.some(
              (field) => activeDropdownFieldId === `${row.id}-${field.fieldName}`
            );
            return (
            <tr
              key={rowKey}
              className={[
                "border-bottom",
                isActiveDropdownRow ? "custom-module-v2__table-row--dropdown-open" : "",
              ].filter(Boolean).join(" ")}
            >
              {module.namedFields?.map((field, fieldIndex) => (
                <td
                  key={field.fieldName}
                  className={[
                    "custom-module-v2__table-cell",
                    activeDropdownFieldId === `${row.id}-${field.fieldName}` ? "custom-module-v2__table-cell--dropdown-open" : "",
                    isVoiceTargetHighlighted(row.id, field.fieldName) ? "custom-module-v2__voice-target-cell" : "",
                  ].filter(Boolean).join(" ")}
                >
                  {isMobile ? (
                    <div
                      onClick={() => {
                        rememberVoiceTarget(row.id, field.fieldName);
                        handleEditRow(row.id);
                      }}
                      style={{ cursor: "pointer", width: "100%", padding: "4px 12px" }}
                    >
                      <TextArea
                        placeholder={`Enter ${field.fieldLabel}`}
                        value={row[field.fieldName] || ""}
                        className="custom-module-v2__input"
                        bordered={false}
                        disabled={true}
                        autoSize={{ minRows: 1, maxRows: 10 }}
                        style={{ 
                          pointerEvents: "none",
                          color: "#000000",
                          WebkitTextFillColor: "#000000",
                          opacity: 1
                        }}
                      />
                    </div>
                  ) : (
                    <CustomModuleFieldTextAreaAutoComplete
                      fieldName={field.fieldName}
                      fieldLabel={field.fieldLabel}
                      value={row[field.fieldName] || ""}
                      onChange={(value) =>
                        handleFieldChange(row.id, field.fieldName, value)
                      }
                      moduleId={module.module_id}
                      templates={templates || []}
                      className="custom-module-v2__input w-100"
                      fieldId={`${row.id}-${field.fieldName}`}
                      focusedFieldId={focusedFieldId}
                      onFocusChange={(nextFocusedFieldId) => {
                        setFocusedFieldId(nextFocusedFieldId);
                        if (nextFocusedFieldId) {
                          rememberVoiceTarget(row.id, field.fieldName);
                        }
                      }}
                      onCursorChange={(selection) => rememberVoiceTarget(row.id, field.fieldName, selection)}
                    />
                  )}
                </td>
              ))}
              <td className="custom-module-v2__table-cell custom-module-v2__table-cell--action text-center">
                {isMobile && (
                  <Button
                    className="btn py-0 btn-delete-prescription px-0"
                    onClick={() => handleEditRow(row.id)}
                  >
                    <i className="icon-Edit"></i>
                  </Button>
                )}
                <Button
                  className="btn py-0 btn-delete-prescription px-0"
                  onClick={() => handleDeleteRow(row.id)}
                >
                  {isVoiceRxModuleEnabled ? <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" /> : <i className="icon-delete"></i>}
                </Button>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>

      {/* Add New Line Button */}
      <div
        className={
          isVoiceRxModuleEnabled && voiceCaptureOpen
            ? [voiceModuleStyles.moduleSlot, voiceModuleStyles.moduleCaptureActiveSlot].filter(Boolean).join(" ")
            : "p-14"
        }
      >
        {isVoiceRxModuleEnabled && voiceCaptureOpen ? (
          <VoiceRxModuleCapture
            mode="transcribe"
            moduleName={module?.name || "Custom Module"}
            onCancel={() => setVoiceCaptureOpen(false)}
            onComplete={handleVoiceCaptureComplete} />
        ) : (
          <Button
            type="link"
            icon={<PlusOutlined />}
            className="add-custom-module-link"
            onClick={handleAddRow}
          >
            Add New Line
          </Button>
        )}
      </div>

      {/* Template Drawer for Tablet/Mobile */}
      {isMobile && (
        <Drawer
          title={`${module?.name} Templates`}
          placement="right"
          onClose={handleDrawerTemplate}
          open={templateDrawer}
          className="modalWidth-563"
          width="auto"
        >
          {TEMPLATE_CONTENT()}
        </Drawer>
      )}

      {/* Save Template Drawer for Tablet/Mobile */}
      {isMobile && (
        <Drawer
          title="Save Template"
          placement="right"
          onClose={handleSaveTemplateDrawer}
          open={saveDrawer}
          className="modalWidth-563"
          width="auto"
        >
          {SAVE_CONTENT()}
        </Drawer>
      )}

      <CustomModuleV2Drawer
        open={drawerOpen}
        moduleName={module?.name}
        fields={module?.namedFields}
        values={drawerValues}
        onFieldChange={handleDrawerFieldChange}
        onClose={closeDrawer}
        onSave={handleDrawerSave}
        moduleId={module?.module_id}
        templates={templates || []}
      />

      <EditCustomModuleDrawer
        open={isEditModuleDrawerOpen}
        onClose={() => setIsEditModuleDrawerOpen(false)}
        module={module}
      />

      {/* Delete Confirmation Modal */}
      {DELETE_CONFIRMATION_MODAL}
    </div>
  );
};

export default CustomModuleV2;
