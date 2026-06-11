import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Input, Radio, Tooltip, Alert, message, Divider } from "antd";
import {
  InfoCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { customizedPad } from "../../redux/doctorsSlice";

import ModuleListItem from "./ModuleListItem";
import { getDecodedToken } from "../../utils/localStorage";
import config from "../../config";
import "./CreateNewModuleTab.scss";
import { ASSETS } from "../../assets";
const {
  alerticon: alertIcon,
  stethoscope: stethoscopeIcon,
} = ASSETS.images;
const Plus = ASSETS.images.websiteImages.plus;
const moduleLimitIcon = ASSETS.images.modulelimiticon;

const MAX_MODULE_NAME_LENGTH = 30;
const MAX_COLUMN_LABEL_LENGTH = 15;
const MAX_MODULES = 15;

/**
 * CreateNewModuleTab Component
 *
 * Tab content for creating a new custom module or editing an existing one.
 * Includes module name input, column configuration, and column labels.
 *
 * @param {Function} onCreateModule - Callback when module is created/updated
 * @param {Function} onFormChange - Callback when form data changes (for button state)
 * @param {Boolean} editMode - Whether in edit mode
 * @param {Object} initialData - Initial data for edit mode {moduleName, columnCount, columnLabels}
 */
const CreateNewModuleTab = ({ onCreateModule, onFormChange, editMode = false, initialData = null }) => {
  const dispatch = useDispatch();
  const { customModules, hospitalSearchResults } = useSelector((state) => state.customModules);
  const { customizedPadRightList, customizedPadLeftList, userId } = useSelector(
    (state) => state.doctors
  );
  const [moduleName, setModuleName] = useState(initialData?.moduleName || "");
  const [columnCount, setColumnCount] = useState(initialData?.columnCount || 2);
  const [columnLabels, setColumnLabels] = useState(
    initialData?.columnLabels && initialData.columnLabels.length > 0
      ? initialData.columnLabels
      : ["", ""]
  );
  const [similarModules, setSimilarModules] = useState([]);
  const [showColumnConfig, setShowColumnConfig] = useState(editMode || false);
  const [expandedModules, setExpandedModules] = useState({});
  
  const decodedToken = getDecodedToken();
  const hospital_business_id = decodedToken?.result?.hospital_business_id;
  const isApollo = config.APOLLO_BUSINESS_IDS_CM_V2?.includes(hospital_business_id);

  // Count user-created modules (exclude cloned modules with origin_id)
  const userCreatedModules = customModules?.filter((module) => !module.origin_id) || [];
  const moduleCount = userCreatedModules.length;
  const isModuleLimitReached = moduleCount >= MAX_MODULES;

  // Initialize form data when initialData changes (for edit mode)
  // Use a ref to track if we've already initialized to prevent infinite loops
  const hasInitialized = useRef(false);
  const prevInitialDataRef = useRef(null);
  const prevColumnCountRef = useRef(columnCount);
  
  useEffect(() => {
    // Check if initialData actually changed
    const initialDataChanged = 
      !prevInitialDataRef.current ||
      prevInitialDataRef.current.moduleName !== initialData?.moduleName ||
      prevInitialDataRef.current.columnCount !== initialData?.columnCount ||
      JSON.stringify(prevInitialDataRef.current.columnLabels) !== JSON.stringify(initialData?.columnLabels);
    
    if (initialData && editMode && (!hasInitialized.current || initialDataChanged)) {
      const initColumnCount = initialData.columnCount || 2;
      setModuleName(initialData.moduleName || "");
      setColumnCount(initColumnCount);
      setColumnLabels(
        initialData.columnLabels && initialData.columnLabels.length > 0
          ? initialData.columnLabels
          : Array(initColumnCount).fill("")
      );
      setShowColumnConfig(true);
      hasInitialized.current = true;
      prevInitialDataRef.current = initialData;
      prevColumnCountRef.current = initColumnCount;
    }
    
    // Reset when drawer closes (when editMode becomes false)
    if (!editMode) {
      hasInitialized.current = false;
      prevInitialDataRef.current = null;
      prevColumnCountRef.current = columnCount;
    }
  }, [initialData, editMode]);

  // Check for similar module names (skip in edit mode)
  useEffect(() => {
    if (editMode) {
      setSimilarModules([]);
      return;
    }
    
    if (moduleName.trim().length >= 2) {
      const query = moduleName.toLowerCase().trim();
      let similar = (hospitalSearchResults?.modules || []).filter((module) =>
        module.name?.toLowerCase().includes(query)
      );
      
      // For Apollo users, filter to show only modules created by the logged-in user
      if (isApollo) {
        similar = similar.filter((module) => module.userId === userId);
      }
      
      setSimilarModules(similar);
    } else {
      setSimilarModules([]);
    }
  }, [moduleName, hospitalSearchResults, isApollo, userId, editMode]);

  // Update column labels when column count changes
  // In edit mode, preserve existing labels and add empty ones for new columns
  useEffect(() => {
    // Skip if we're still initializing from initialData
    if (editMode && initialData && !hasInitialized.current) {
      prevColumnCountRef.current = columnCount;
      return;
    }
    
    // Only update if column count actually changed (not just on mount)
    if (prevColumnCountRef.current !== columnCount) {
      // Update column labels based on new column count
      // Use functional update to get latest columnLabels state
      setColumnLabels((prevLabels) => {
        const newLabels = Array(columnCount)
          .fill("")
          .map((_, index) => prevLabels[index] || "");
        return newLabels;
      });
      prevColumnCountRef.current = columnCount;
    }
  }, [columnCount, editMode, initialData]);

  const handleModuleNameChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_MODULE_NAME_LENGTH) {
      setModuleName(value);
      // Reset column config visibility when module name changes
      if (showColumnConfig) {
        setShowColumnConfig(false);
      }
    }
  };

  const handleColumnLabelChange = (index, value) => {
    if (value.length <= MAX_COLUMN_LABEL_LENGTH) {
      const newLabels = [...columnLabels];
      newLabels[index] = value;
      setColumnLabels(newLabels);
    }
  };

  const handleColumnCountChange = (e) => {
    setColumnCount(parseInt(e.target.value));
  };

  const isFormValid = useMemo(() => {
    return (
      moduleName.trim().length > 0 &&
      columnLabels.every((label) => label.trim().length > 0)
    );
  }, [moduleName, columnLabels]);

  // Notify parent of form state changes
  // Use a ref to store previous values to prevent unnecessary updates
  const prevFormDataRef = useRef(null);
  
  useEffect(() => {
    if (onFormChange) {
      const currentFormData = {
        isValid: isFormValid,
        moduleName,
        columnCount,
        columnLabels,
      };
      
      // Only call onFormChange if data actually changed
      const prevData = prevFormDataRef.current;
      if (
        !prevData ||
        prevData.isValid !== currentFormData.isValid ||
        prevData.moduleName !== currentFormData.moduleName ||
        prevData.columnCount !== currentFormData.columnCount ||
        JSON.stringify(prevData.columnLabels) !== JSON.stringify(currentFormData.columnLabels)
      ) {
        prevFormDataRef.current = currentFormData;
        onFormChange(currentFormData);
      }
    }
  }, [isFormValid, moduleName, columnCount, columnLabels, onFormChange]);

  const handleUseExistingModule = useCallback(
    async (module) => {
      if (!module || !module.module_id) {
        message.error("Invalid module selected");
        return;
      }

      try {
        // Check if module already exists in the right pad
        const moduleExists = customizedPadRightList?.some(
          (item) => item.tmdpm_id === module.module_id
        );

        if (moduleExists) {
          message.warning("This module is already added to your prescription pad");
          return;
        }

        // Add module to customized pad right list
        const updatedRightPad = [
          ...(customizedPadRightList || []),
          {
            tmdpm_id: module.module_id,
            tmdpm_name: module.name,
            tmdpm_short_name: module.name,
            tmdpm_type: "R",
            tmdpm_status: 0,
            is_custom_module: true,
          },
        ];

        const sendData = {
          data: {
            default: false,
            reset: false,
            left: customizedPadLeftList || [],
            right: updatedRightPad,
          },
        };

        await dispatch(customizedPad(sendData)).unwrap();
        message.success(
          `"${module.name}" has been added to your prescription pad`
        );
      } catch (error) {
        console.error("Error adding module to Rx:", error);
        message.error(
          error?.message || "Failed to add module to prescription pad"
        );
      }
    },
    [dispatch, customizedPadRightList, customizedPadLeftList]
  );

  const handleAddAsNew = () => {
    // Show the column configuration section when user decides to add as new
    setShowColumnConfig(true);
  };

  const handleViewMore = (moduleId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Resolve creator name for a module (similar to DisabledModuleTooltip logic)
  const getCreatorName = useCallback((module) => {
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
  }, [hospitalSearchResults]);

  // Show module limit warning if limit is reached and not in edit mode
  if (isModuleLimitReached && !editMode) {
    return (
      <div className="create-new-module-tab">
        <div className="create-new-module-tab__content">
          <div className="create-new-module-tab__limit-warning">
            <div className="create-new-module-tab__limit-icon">
              <img src={moduleLimitIcon} alt="Module limit reached" />
            </div>
            <h3 className="create-new-module-tab__limit-title">
              Module limit reached
            </h3>
              <h4 className="create-new-module-tab__limit-message">
                You've already created the maximum of <span className="create-new-module-tab__limit-bold">{MAX_MODULES} custom modules</span>. To continue, please use existing modules.
              </h4>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-new-module-tab">
      <div className="create-new-module-tab__content">
        {/* Module Name Section */}
        <div className="create-new-module-tab__section">
          <div className="create-new-module-tab__label">
            <span>
              Module Name <span className="required color-red">*</span>
            </span>
            <Tooltip title="Enter a unique name for your custom module">
              <InfoCircleOutlined className="create-new-module-tab__info-icon" />
            </Tooltip>
          </div>
          <div className="create-new-module-tab__input-wrapper">
            <Input
              placeholder="Eg., Cardiac Assessment or Diet Plan"
              value={moduleName}
              onChange={handleModuleNameChange}
              className="create-new-module-tab__input"
              maxLength={MAX_MODULE_NAME_LENGTH}
            />
            <span className="create-new-module-tab__char-count">
              {moduleName.length}/{MAX_MODULE_NAME_LENGTH}
            </span>
          </div>

          {/* Similar Modules Warning - Only show in create mode */}
          {!editMode && similarModules.length > 0 && (
            <div className="create-new-module-tab__warning">
              <Alert
                message={
                  <div className="d-flex flex-column">
                    <span>Modules with a similar name already exists!</span>
                    <span>Consider using an existing module to avoid duplication.</span>
                  </div>
                }
                type="warning"
                icon={<img className='me-3' src={alertIcon} alt="Warning" />}
                showIcon
                className="create-new-module-tab__alert"
              />
              <div className="create-new-module-tab__similar-modules">
                {similarModules.map((module) => {
                  const isExpanded = expandedModules[module.module_id];
                  const moduleColumnCount =
                    module.version === "v2" && module.namedFields
                      ? module.namedFields.length
                      : 2;
                  const columnLabels =
                    module.version === "v2" && module.namedFields
                      ? module.namedFields.map((field) => field.fieldLabel)
                      : ["Title", "Notes"];

                  return (
                    <div
                      key={module.module_id}
                      className="create-new-module-tab__similar-item"
                    >
                      <div className="create-new-module-tab__similar-container">
                        <div className="create-new-module-tab__similar-header">
                          <h4 className="create-new-module-tab__similar-name">
                            {module.name}
                          </h4>
                          <div className="create-new-module-tab__similar-details">
                            <div className="create-new-module-tab__similar-tags">
                              <span className="create-new-module-tab__similar-tag">
                                <img src={stethoscopeIcon} alt="stethoscope" className="create-new-module-tab__similar-tag-icon" />
                                <span>Dr. {getCreatorName(module)}</span>
                              </span>
                              <span className="create-new-module-tab__similar-tag">
                                {String(moduleColumnCount).padStart(2, "0")}{" "}
                                columns
                              </span>
                            </div>
                            <a
                              className="create-new-module-tab__similar-view-more"
                              onClick={() => handleViewMore(module.module_id)}
                            >
                              {isExpanded ? "View less" : "View more"}
                            </a>
                          </div>
                        </div>
                        <button
                          className="create-new-module-tab__use-button"
                          onClick={() => handleUseExistingModule(module)}
                        >
                          Use this Module
                        </button>
                      </div>

                      {/* Expanded Preview Table */}
                      {isExpanded && (
                        <div className="create-new-module-tab__preview">
                          <div
                            className="create-new-module-tab__preview-table"
                            style={{
                              "--column-count": moduleColumnCount,
                            }}
                          >
                            {/* Column Headers */}
                            <div className="create-new-module-tab__preview-row create-new-module-tab__preview-row--header">
                              {columnLabels.map((label, index) => (
                                <div
                                  key={index}
                                  className="create-new-module-tab__preview-cell create-new-module-tab__preview-cell--header"
                                >
                                  {label.toUpperCase()}
                                </div>
                              ))}
                            </div>

                            {/* Input Placeholders Row */}
                            <div className="create-new-module-tab__preview-row">
                              {columnLabels.map((label, index) => (
                                <div
                                  key={index}
                                  className="create-new-module-tab__preview-cell create-new-module-tab__preview-cell--input"
                                >
                                  <span className="create-new-module-tab__preview-placeholder">
                                    Eg. Add {label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div 
                  className="create-new-module-tab__add-new"
                  onClick={handleAddAsNew}
                >
                  <span>
                    <span className="secondary-text">(or){" "}</span>
                    <span className="create-new-module-tab__add-icon">
                      <img src={Plus} alt="plus"/>
                    </span>
                    <span className="main-text">Add "{moduleName}" as new Custom module</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Configure Columns Section - Show when user clicks "Add as new" or no similar modules, or in edit mode */}
        {(showColumnConfig || (moduleName.trim().length > 0 && similarModules.length === 0) || editMode) && (
        <div className="create-new-module-tab__section">
          <div className="create-new-module-tab__label">
            <span>
              Configure Columns <span className="required color-red">*</span>
            </span>
            <Tooltip title="Select the number of columns for your module">
              <InfoCircleOutlined className="create-new-module-tab__info-icon" />
            </Tooltip>
          </div>
          <Radio.Group
            value={columnCount}
            onChange={handleColumnCountChange}
            className="create-new-module-tab__column-radio-group"
          >
            <Radio.Button value={1}>01 Column</Radio.Button>
            <Radio.Button value={2}>02 Columns</Radio.Button>
            <Radio.Button value={3}>03 Columns</Radio.Button>
            <Radio.Button value={4}>04 Columns</Radio.Button>
          </Radio.Group>

          {/* Set Column Labels */}
          <div className="create-new-module-tab__column-labels-section">
            <h4 className="create-new-module-tab__column-labels-title">
              <Divider plain>Set Column Labels</Divider>
            </h4>
            <div className="create-new-module-tab__column-labels-grid">
              {columnLabels.map((label, index) => (
                <div
                  key={index}
                  className="create-new-module-tab__column-label-item"
                >
                  <div className="create-new-module-tab__column-label-header">
                    <span>
                      Column {index + 1} <span className="required color-red">*</span>
                    </span>
                  </div>
                  <Input
                    placeholder={`Eg., ${index === 0 ? "Diet" : "Notes"}`}
                    value={label}
                    onChange={(e) =>
                      handleColumnLabelChange(index, e.target.value)
                    }
                    className="create-new-module-tab__column-label-input"
                    maxLength={MAX_COLUMN_LABEL_LENGTH}
                    suffix={
                      <span className="create-new-module-tab__char-count-small">
                        {label.length}/{MAX_COLUMN_LABEL_LENGTH}
                      </span>
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* Informational Box */}
        <div className="create-new-module-tab__info-box">
          <div className="create-new-module-tab__info-header">
            <ExclamationCircleOutlined className="create-new-module-tab__info-icon-large" />
            <h3 className="create-new-module-tab__info-title">
              Things to Know Before Creating a Custom Module
            </h3>
          </div>
          <ul className="create-new-module-tab__info-list">
            <li>
              You can <strong>edit/delete</strong> this module until it's used
              in a Rx.
            </li>
            <li>
              Once used, it becomes <strong>locked</strong> — You can't{" "}
              <strong>edit/delete</strong> column names or structure.
            </li>
            <li>
              To make changes later, you'll need to{" "}
              <strong>create a new module</strong>.
            </li>
            <li>
              This helps keep all past prescriptions accurate and unchanged.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateNewModuleTab;
