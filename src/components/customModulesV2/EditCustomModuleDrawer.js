import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Drawer, Button, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import CreateNewModuleTab from "./CreateNewModuleTab";
import ConfirmModuleModal from "./ConfirmModuleModal";
import { addModule, getModules } from "../../redux/customModuleSlice";
import { customizedPad, savePrintsettings } from "../../redux/doctorsSlice";
import { getDecodedToken } from "../../utils/localStorage";
import "./AddCustomModuleDrawer.scss";

/**
 * EditCustomModuleDrawer Component
 *
 * Drawer for editing an existing custom module.
 * Allows editing module name, column count, and column labels.
 *
 * @param {Boolean} open - Controls drawer visibility
 * @param {Function} onClose - Callback to close the drawer
 * @param {Object} module - The module to edit
 */
const EditCustomModuleDrawer = ({ open, onClose, module }) => {
  const dispatch = useDispatch();
  const { userId, customizedPadRightList, customizedPadLeftList, defaultPrintSettings } =
    useSelector((state) => state.doctors);
  const { loading, customModules } = useSelector(
    (state) => state.customModules
  );
  const [createModuleFormData, setCreateModuleFormData] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  // Used to force reset of CreateNewModuleTab internal state after successful edit
  const [createTabKey, setCreateTabKey] = useState(0);

  // Initialize form data from module when drawer opens
  useEffect(() => {
    if (open && module) {
      const initialFormData = {
        moduleName: module.name || "",
        columnCount: module.namedFields?.length || 2,
        columnLabels: module.namedFields?.map((field) => field.fieldLabel) || ["", ""],
      };
      setCreateModuleFormData({
        ...initialFormData,
        isValid: true, // Pre-filled data is valid
      });
      // Force remount to pre-fill the form
      setCreateTabKey((prev) => prev + 1);
    }
  }, [open, module]);

  const handleSaveChanges = () => {
    // Show confirmation modal
    if (createModuleFormData?.isValid) {
      setConfirmModalOpen(true);
    }
  };

  const handleConfirmEdit = useCallback(
    async (moduleData) => {
      if (!moduleData || !userId || !module?.module_id) {
        message.error("Missing required information");
        return;
      }

      try {
        // Helper function to convert label to camelCase fieldName
        const toCamelCase = (str) => {
          return str
            .trim()
            // Replace spaces and special characters with a marker
            .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => {
              return chr ? chr.toUpperCase() : '';
            })
            // Make first character lowercase
            .replace(/^[A-Z]/, (chr) => chr.toLowerCase());
        };

        // Transform form data to V2 module format
        const namedFields = moduleData.columnLabels.map((label, index) => ({
          fieldName: toCamelCase(label),
          fieldLabel: label.trim(),
          fieldType: "string",
          isRequired: false,
          order: index,
        }));

        // Update existing module (keep same module_id)
        const updatedModule = {
          module_id: module.module_id,
          name: moduleData.moduleName.trim(),
          version: "v2",
          namedFields: namedFields,
          // Preserve other properties
          templates: module.templates || [],
          userId: module.userId,
          origin_id: module.origin_id,
        };

        // Get all existing user modules and update the one being edited
        const allModules = (customModules || []).map((cm) => {
          if (cm.module_id === module.module_id) {
            return updatedModule;
          }
          return cm;
        });

        const payload = {
          userId: userId,
          modules: allModules,
        };

        await dispatch(addModule(payload)).unwrap();

        // Step 1: Update module name in print settings
        if (defaultPrintSettings?.prescription?.case_option) {
          const caseOptions = defaultPrintSettings.prescription.case_option;

          const updatedCaseOptions = caseOptions.map((option) => {
            if (option.id === module.module_id && option.is_custom_module) {
              return {
                ...option,
                title: moduleData.moduleName.trim(),
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

        // Step 2: Update module name in customized pad
        const updatedRightPad = customizedPadRightList.map((item) => {
          if (item.tmdpm_id === module.module_id && item.is_custom_module) {
            return {
              ...item,
              tmdpm_name: moduleData.moduleName.trim(),
              tmdpm_short_name: moduleData.moduleName.trim(),
            };
          }
          return item;
        });

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
          `Module "${moduleData.moduleName}" updated successfully!`
        );

        setConfirmModalOpen(false);
        // Close drawer after edit
        onClose();
        // Reset form data
        setCreateModuleFormData(null);
        // Force remount of CreateNewModuleTab so its internal state (inputs) is cleared
        setCreateTabKey((prev) => prev + 1);
      } catch (error) {
        console.error("Error updating module:", error);
        const errorMessage =
          error?.message ||
          error?.error ||
          "Failed to update module. Please try again.";
        message.error(errorMessage);
      }
    },
    [dispatch, userId, onClose, customModules, module, customizedPadRightList, customizedPadLeftList, defaultPrintSettings]
  );

  const handleFormChange = useCallback((formData) => {
    // Only update if form data actually changed to prevent infinite loops
    setCreateModuleFormData((prev) => {
      if (
        prev?.moduleName === formData?.moduleName &&
        prev?.columnCount === formData?.columnCount &&
        JSON.stringify(prev?.columnLabels) === JSON.stringify(formData?.columnLabels) &&
        prev?.isValid === formData?.isValid
      ) {
        return prev; // No change, return previous state
      }
      return formData;
    });
  }, []);

  const isSaveButtonEnabled = useMemo(() => {
    return createModuleFormData?.isValid || false;
  }, [createModuleFormData]);

  // Memoize initialData to prevent infinite loops
  const initialData = useMemo(() => {
    if (!module) return null;
    return {
      moduleName: module.name || "",
      columnCount: module.namedFields?.length || 2,
      columnLabels: module.namedFields?.map((field) => field.fieldLabel) || [],
    };
  }, [module?.name, module?.namedFields]);

  if (!module) {
    return null;
  }

  return (
    <Drawer
      placement="right"
      onClose={onClose}
      open={open}
      closable={false}
      width={800}
      className="add-custom-module-drawer"
    >
      <div className="add-custom-module-drawer__header">
        <div className="add-custom-module-drawer__header-left">
          <ArrowLeftOutlined
            className="add-custom-module-drawer__back-icon"
            onClick={onClose}
          />
          <h2 className="add-custom-module-drawer__title">Edit Custom Module</h2>
        </div>
        <Button
          type="primary"
          className="add-custom-module-drawer__create-button"
          disabled={!isSaveButtonEnabled || loading}
          loading={loading}
          onClick={handleSaveChanges}
        >
          Save Changes
        </Button>
      </div>

      <div className="add-custom-module-drawer__tabs">
        <CreateNewModuleTab
          key={createTabKey}
          onCreateModule={handleSaveChanges}
          onFormChange={handleFormChange}
          editMode={true}
          initialData={initialData}
        />
      </div>

      {/* Confirm Module Modal */}
      <ConfirmModuleModal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmEdit}
        moduleData={createModuleFormData}
        loading={loading}
        isEditMode={true}
      />
    </Drawer>
  );
};

export default EditCustomModuleDrawer;
