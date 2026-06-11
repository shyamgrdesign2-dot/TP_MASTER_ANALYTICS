import React, { useState, useMemo } from "react";
import { Button, Tooltip, message, Input } from "antd";
import { PlusOutlined, MoreOutlined, UserOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import "./ModuleListItem.scss";
import { useSelector, useDispatch } from "react-redux";
import { addModule } from "../../redux/customModuleSlice";
import { customizedPad, savePrintsettings } from "../../redux/doctorsSlice";
import { getClinic } from "../../utils/utils";
import { getDecodedToken } from "../../utils/localStorage";

import DisabledModuleTooltip from "./DisabledModuleTooltip";
import CommonModal from "../../common/CommonModal";
import { ASSETS } from "../../assets";
const {
  editIconBlue: editIcon,
  deleteIconBlue: deleteIcon,
  alerticon: alertIcon,
  stethoscope: stethoscopeIcon,
} = ASSETS.images;

/**
 * ModuleListItem Component
 *
 * Individual module card component displaying module information
 * and action buttons.
 *
 * @param {Object} module - Module data object
 * @param {Function} onAddToRx - Callback when "Add to Rx" is clicked
 * @param {Function} onViewMore - Callback when "View more" is clicked
 * @param {Function} onDelete - Optional callback after successful deletion
 */
const ModuleListItem = ({ module, onAddToRx, onViewMore, onDelete }) => {
  const dispatch = useDispatch();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canEditName, setCanEditName] = useState(false);
  const [newModuleName, setNewModuleName] = useState(module?.name || "");
  const [isDeleteConfirmationModalOpen, setIsDeleteConfirmationModalOpen] = useState(false);
  const {
    profile,
    userId,
    customizedPadLeftList,
    customizedPadRightList,
    defaultPrintSettings,
  } = useSelector((state) => state.doctors);
  const { customModules, hospitalSearchResults } = useSelector(
    (state) => state.customModules
  );
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

  // Calculate column count based on module version
  const getColumnCount = () => {
    if (module.version === "v2" && module.namedFields) {
      return module.namedFields.length;
    }
    return 2; // V1 has title + notes
  };

  const columnCount = getColumnCount();

  // Get column labels for preview
  const getColumnLabels = () => {
    if (module.version === "v2" && module.namedFields) {
      return module.namedFields.map(
        (field) => field.fieldLabel || field.fieldName
      );
    }
    // V1 modules have title and notes
    return ["Title", "Notes"];
  };

  const columnLabels = getColumnLabels();

  // Get creator name (from module or hospitalSearchResults)
  const creatorName = (() => {
    if (module.creator_name || module.doctor_name) {
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
  })();

  // Check if module is disabled (used or cloned by the user)
  const isModuleDisabled = (module.hasBeenUsed || module.hasBeenCloned  || module.userId != userId);

  // More options menu items
  const menuItems = [
    {
      key: "edit",
      label: isModuleDisabled ? (
        <DisabledModuleTooltip
          module={module}
          hospitalSearchResults={hospitalSearchResults}
        >
          <span>
            <img
              src={editIcon}
              width={16}
              height={16}
              alt="edit"
              style={{ margin: "0 8px 3px 0" }}
            />
            Edit Module Name
          </span>
        </DisabledModuleTooltip>
      ) : (
        <span>
          <img
            src={editIcon}
            width={16}
            height={16}
            alt="edit"
            style={{ margin: "0 8px 3px 0" }}
          />
          Edit Module Name
        </span>
      ),
      disabled: isModuleDisabled,
    },
    // {
    //   key: "duplicate",
    //   label: (
    //     <span>
    //       <CopyOutlined style={{ marginRight: 8 }} />
    //       Duplicate
    //     </span>
    //   ),
    // },
    {
      key: "delete",
      label: isModuleDisabled ? (
        <DisabledModuleTooltip
          module={module}
          hospitalSearchResults={hospitalSearchResults}
        >
          <span>
            <img
              src={deleteIcon}
              width={16}
              height={16}
              alt="edit"
              style={{ margin: "0 8px 3px 0" }}
            />
            Delete Module
          </span>
        </DisabledModuleTooltip>
      ) : (
        <span>
          <img
            src={deleteIcon}
            width={16}
            height={16}
            alt="edit"
            style={{ margin: "0 8px 3px 0" }}
          />
          Delete Module
        </span>
      ),
      disabled: isModuleDisabled,
    },
  ];

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
      const modules = customModules.filter((cm) => cm.module_id !== module.module_id);
      const action = await dispatch(addModule({ userId, modules }));
      
      if (action.meta.requestStatus === "fulfilled") {
        // Step 2: Remove from print settings
        if (defaultPrintSettings?.prescription?.case_option) {
          const caseOptions = defaultPrintSettings.prescription.case_option;
          
          const updatedCaseOptions = caseOptions.filter(
            (option) => !(option.id === module.module_id && option.is_custom_module)
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

        setIsDeleteConfirmationModalOpen(false);

        message.success({
          content: `Module "${module.name}" deleted successfully`,
          key: "deleteModule",
          duration: 3
        });
        
        // Call onDelete callback to refresh the list if provided
        if (onDelete) {
          onDelete(module.module_id);
        }
      } else {
        message.error({
          content: "Failed to delete module",
          key: "deleteModule",
          duration: 3
        });
      }
    } catch (error) {
      console.error("Error deleting module:", error);
      message.error({
        content: "Failed to delete module. Please try again.",
        key: "deleteModule",
        duration: 3
      });
    }
  };

  const handleDeleteConfirmationModal = () => {
    setIsDeleteConfirmationModalOpen(false);
  };

  // Handle edit module name
  const handleEditModuleName = async () => {
    if (!newModuleName.trim()) {
      message.error("Module name cannot be empty.");
      return;
    }
    if (customModules.some((cm) => cm.module_id !== module.module_id && cm.name === newModuleName.trim())) {
      message.error("Module name already exists.");
      return;
    }

    try {
      message.loading({ content: "Updating module name...", key: "editModule" });

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
          duration: 3
        });
        
        // Call onDelete callback to refresh the list if provided
        if (onDelete) {
          onDelete();
        }
      }
    } catch (error) {
      console.error("Error updating module name:", error);
      message.error({
        content: error?.message || "Failed to update module name.",
        key: "editModule",
        duration: 3
      });
    }
  };

  // Handle cancel edit module name
  const handleCancelEdit = () => {
    setCanEditName(false);
    setNewModuleName(module?.name || "");
  };

  const handleMenuClick = ({ key }) => {
    setDropdownVisible(false);
    
    if (key === "delete" && !isModuleDisabled) {
      handleDeleteModuleClick();
    } else if (key === "edit" && !isModuleDisabled) {
      // Track MoEngage event for edit module
      if (window.Moengage) {
        window.Moengage.track_event("TP_CM2_Edit", getMoeData());
      }
      setCanEditName(true);
    }
  };

  const handleAddToRx = () => {
    if (onAddToRx) {
      onAddToRx(module);
    }
  };

  const handleViewMore = (e) => {
    e.preventDefault();
    setIsExpanded(!isExpanded);
    // Also call the callback if provided
    if (onViewMore && !isExpanded) {
      onViewMore(module);
    }
  };

  // Set CSS variable for grid columns
  const gridStyle = {
    "--column-count": columnCount,
  };

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

  return (
    <div className="module-list-item">
      <div className="module-list-item__content" style={gridStyle}>
        <div className="module-list-item__container">
          {canEditName ? (
            <div className="module-list-item__edit-container">
              <Input
                placeholder="Enter custom module name"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                className="module-list-item__edit-input"
                autoFocus
              />
              <div className="module-list-item__edit-actions">
                <CheckOutlined
                  className="module-list-item__edit-icon module-list-item__edit-icon--check"
                  onClick={handleEditModuleName}
                />
                <CloseOutlined
                  className="module-list-item__edit-icon module-list-item__edit-icon--close"
                  onClick={handleCancelEdit}
                />
              </div>
            </div>
          ) : (
            <>
          <div className="module-list-item__header">
            <h3 className="module-list-item__name">{module.name}</h3>
            <div className="module-list-item__details">
              <div className="module-list-item__tags">
                <span className="module-list-item__tag module-list-item__tag--creator">
                  <img src={stethoscopeIcon} alt="stethoscope" className="create-new-module-tab__similar-tag-icon" />
                  <span>{creatorName}</span>
                </span>
                <span className="module-list-item__tag module-list-item__tag--columns">
                  {String(columnCount).padStart(2, "0")} columns
                </span>
              </div>
              <a className="module-list-item__view-more" onClick={handleViewMore}>
                {isExpanded ? "View less" : "View more"}
              </a>
            </div>
          </div>
          <div className="module-list-item__actions">
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={handleAddToRx}
              className="module-list-item__add-button"
            >
              Add to Rx
            </Button>
            <Dropdown
              menu={{
                items: menuItems,
                onClick: handleMenuClick,
              }}
              trigger={["click"]}
              open={dropdownVisible}
              onOpenChange={setDropdownVisible}
              placement="bottomRight"
              overlayClassName="module-list-item-dropdown"
              getPopupContainer={(trigger) => document.body}
            >
              <Button
                type="text"
                icon={<MoreOutlined />}
                className="module-list-item__more-button"
              />
            </Dropdown>
          </div>
            </>
          )}
        </div>

        {/* Expanded Preview Table */}
        {isExpanded && (
          <div className="module-list-item__preview">
            <div className="module-list-item__preview-table">
              {/* Column Headers */}
              <div className="module-list-item__preview-row module-list-item__preview-row--header">
                {columnLabels.map((label, index) => (
                  <div
                    key={index}
                    className="module-list-item__preview-cell module-list-item__preview-cell--header"
                  >
                    {label.toUpperCase()}
                  </div>
                ))}
              </div>

              {/* Input Placeholders Row */}
              <div className="module-list-item__preview-row">
                {columnLabels.map((label, index) => (
                  <div
                    key={index}
                    className="module-list-item__preview-cell module-list-item__preview-cell--input"
                  >
                    <span className="module-list-item__preview-placeholder">
                      Enter {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {DELETE_CONFIRMATION_MODAL}
    </div>
  );
};

export default ModuleListItem;
