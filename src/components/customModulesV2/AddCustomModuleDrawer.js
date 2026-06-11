import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Drawer, Tabs, Button, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import SelectExistingModuleTab from "./SelectExistingModuleTab";
import CreateNewModuleTab from "./CreateNewModuleTab";
import ConfirmModuleModal from "./ConfirmModuleModal";
import { addModule, getModules, searchModulesByHospital, cloneModule } from "../../redux/customModuleSlice";
import { customizedPad, savePrintsettings } from "../../redux/doctorsSlice";
import { getDecodedToken } from "../../utils/localStorage";
import { getClinic } from "../../utils/utils";
import "./AddCustomModuleDrawer.scss";

const MAX_MODULES = 15;

const { TabPane } = Tabs;

/**
 * AddCustomModuleDrawer Component
 *
 * Main drawer container for adding custom modules.
 * Contains tabs for "Select Existing Module" and "Create New Module".
 *
 * @param {Boolean} open - Controls drawer visibility
 * @param {Function} onClose - Callback to close the drawer
 */
const AddCustomModuleDrawer = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { userId, customizedPadRightList, customizedPadLeftList, defaultPrintSettings, profile } =
    useSelector((state) => state.doctors);
  const { loading, customModules, hospitalSearchResults } = useSelector(
    (state) => state.customModules
  );
  const [activeTab, setActiveTab] = useState("select"); // "select" | "create"
  const [createModuleFormData, setCreateModuleFormData] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  // Used to force reset of CreateNewModuleTab internal state after successful creation
  const [createTabKey, setCreateTabKey] = useState(0);
  // Local loading state for module creation process (prevents multiple clicks)
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const decodedToken = getDecodedToken();
  const hospitalId = decodedToken?.result?.clinic_id;

  const userCreatedModules = customModules?.filter((module) => !module.origin_id) || [];
  const moduleCount = userCreatedModules.length;
  const isDisabled = moduleCount >= MAX_MODULES;
  // Fetch modules when drawer opens
  useEffect(() => {
    if (open && userId) {
      // Fetch user's own modules (needed for upsert operation)
      dispatch(getModules(userId));
    }
    if (open && hospitalId) {
      // Fetch all hospital modules for display
      dispatch(searchModulesByHospital({
        hospitalId,
        moduleName: "",
        page: 1,
        limit: 100,
        departmentId: profile?.dp_id
      }));
    }
  }, [open, userId, hospitalId, dispatch]);

  const handleAddToRx = useCallback(
    async (module) => {
      // Track MoEngage event for add to Rx from existing modules
      if (window.Moengage) {
        const clinic = getClinic(profile?.hospital_data);
        const moeData = {
          doctor_name: profile?.um_name || "",
          doctor_um_id: userId || "",
          specialty: profile?.dp_name || "",
          doctor_mobile_no: profile?.um_contact || "",
          sub_doctor: profile?.is_sub_doctor ? 1 : 0,
          hospital_id: clinic?.hm_id || hospitalId || "",
          created_by: module?.userId || "", // UM_ID of the creator
        };
        window.Moengage.track_event("TP_CMV2_AddtoRx", moeData);
      }

      if (!module || !module.module_id) {
        message.error("Invalid module selected");
        return;
      }

      let targetModuleId = module.module_id;
      let targetModuleName = module.name;
      let needsCloning = false;

      try {
        // Step 1: Check if the module is from another doctor and handle cloning
        const isOwnModule = module.userId == userId;
        
        if (!isOwnModule) {
          // Check if user already has this module cloned (check by origin_id)
          const alreadyCloned = customModules?.find(
            (m) => m.origin_id === module.module_id
          );

          if (!alreadyCloned) {
            needsCloning = true;
            message.loading({ content: "Cloning module...", key: "addToRx" });

            try {
              // Clone the module from source user to current user
              await dispatch(
                cloneModule({
                  sourceUserId: module.userId,
                  sourceModuleId: module.module_id,
                  targetUserId: userId,
                })
              ).unwrap();

              message.success({ content: "Module cloned successfully", key: "addToRx", duration: 2 });

              // Refresh customModules to include the newly cloned module
              const updatedModulesResponse = await dispatch(getModules(userId)).unwrap();
              
              // Find the newly cloned module by origin_id
              const clonedModule = updatedModulesResponse?.modules?.find(
                (m) => m.origin_id === module.module_id
              );

              if (!clonedModule || !clonedModule.module_id) {
                console.error("Failed to find cloned module:", {
                  sourceModuleId: module.module_id,
                  allModules: updatedModulesResponse?.modules,
                });
                throw new Error("Failed to retrieve cloned module information");
              }

              // Update the target module ID to the newly cloned module's ID
              targetModuleId = clonedModule.module_id;
              targetModuleName = clonedModule.name;

            } catch (cloneError) {
              console.error("Cloning failed:", cloneError);
              message.error({
                content: cloneError?.message || "Failed to clone module. Please try again.",
                key: "addToRx",
                duration: 3
              });
              // Return early - do not proceed with print settings or customized pad
              return;
            }
          } else {
            // Use the already cloned module's ID
            targetModuleId = alreadyCloned.module_id;
            targetModuleName = alreadyCloned.name;
            
            // Refresh customModules to ensure we have the latest data
            await dispatch(getModules(userId)).unwrap();
          }
        }

        // Validate that we have valid module ID and name before proceeding
        if (!targetModuleId || !targetModuleName) {
          console.error("Invalid module data:", { targetModuleId, targetModuleName, module });
          message.error({
            content: "Invalid module information. Please try again.",
            key: "addToRx",
            duration: 3
          });
          return;
        }

        // Step 2: Check if module already exists in the right pad
        const moduleExistsInRx = customizedPadRightList?.some(
          (item) => item.tmdpm_id === targetModuleId
        );

        if (moduleExistsInRx) {
          message.warning("This module is already added to your prescription pad");
          return;
        }

        message.loading({ content: "Updating prescription pad...", key: "addToRx" });

        // Step 3: Sync print settings (add module to print settings)
        try {
          if (defaultPrintSettings?.prescription?.case_option) {
            const caseOptions = defaultPrintSettings.prescription.case_option;
            
            // Check if module is already in print settings
            const existsInPrintSettings = caseOptions.some(
              (option) => option.id === targetModuleId && option.is_custom_module
            );

            if (!existsInPrintSettings) {
              const updatedCaseOptions = [
                ...caseOptions,
                {
                  id: targetModuleId,
                  title: targetModuleName,
                  format: "table",
                  enable: "Y",
                  custom_status: "Y",
                  is_custom_module: true,
                },
              ];

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
          }
        } catch (printSettingsError) {
          console.error("Failed to update print settings:", printSettingsError);
          message.error({
            content: "Failed to update print settings. Please try again.",
            key: "addToRx",
            duration: 3
          });
          // Return early - do not proceed with customized pad if print settings fail
          return;
        }

        // Step 4: Add module to customized pad right list (Rx pad)
        try {
          const updatedRightPad = [
            ...(customizedPadRightList || []),
            {
              tmdpm_id: targetModuleId,
              tmdpm_name: targetModuleName,
              tmdpm_short_name: targetModuleName,
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
          
          // Refresh customModules to ensure the newly added/cloned module is available
          // This is critical for the prescription page to find and render the module
          await dispatch(getModules(userId)).unwrap();
          
          // Also refresh hospital search results to ensure all modules are available
          if (hospitalId) {
            await dispatch(searchModulesByHospital({
              hospitalId,
              moduleName: "",
              page: 1,
              limit: 100,
              departmentId: profile?.dp_id
            })).unwrap();
          }
          
          message.success({
            content: needsCloning 
              ? `"${targetModuleName}" cloned and added to your prescription pad!`
              : `"${targetModuleName}" has been added to your prescription pad`,
            key: "addToRx",
            duration: 3
          });
          
          onClose();
        } catch (customizedPadError) {
          console.error("Failed to update customized pad:", customizedPadError);
          message.error({
            content: "Failed to add module to prescription pad. Please try again.",
            key: "addToRx",
            duration: 3
          });
        }
      } catch (error) {
        console.error("Unexpected error in handleAddToRx:", error);
        message.error({
          content: error?.message || "An unexpected error occurred. Please try again.",
          key: "addToRx",
          duration: 3
        });
      }
    },
    [
      dispatch,
      userId,
      customModules,
      customizedPadRightList,
      customizedPadLeftList,
      defaultPrintSettings,
      onClose,
      hospitalId,
      profile?.dp_id,
    ]
  );

  const handleViewMore = useCallback((module) => {
    // TODO: Implement view more functionality - could open a modal with module details
    message.info(`View more details for: ${module.name}`);
  }, []);

  const handleCreateModule = () => {
    // Show confirmation modal
    if (createModuleFormData?.isValid) {
      setConfirmModalOpen(true);
    }
  };

  const handleConfirmModule = useCallback(
    async (moduleData) => {
      if (!moduleData || !userId) {
        message.error("Missing required information");
        return;
      }

      // Prevent multiple clicks by setting loading state immediately
      if (isCreatingModule) {
        return;
      }

      // Track MoEngage event for create and add to Rx
      if (window.Moengage) {
        const clinic = getClinic(profile?.hospital_data);
        const moeData = {
          doctor_name: profile?.um_name || "",
          doctor_um_id: userId || "",
          specialty: profile?.dp_name || "",
          doctor_mobile_no: profile?.um_contact || "",
          sub_doctor: profile?.is_sub_doctor ? 1 : 0,
          hospital_id: clinic?.hm_id || hospitalId || "",
        };
        window.Moengage.track_event("TP_CMV2_Create&Add", moeData);
      }

      setIsCreatingModule(true);

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

        // Create new module payload (without module_id - DB will generate it)
        const newModulePayload = {
          name: moduleData.moduleName.trim(),
          version: "v2",
          namedFields: namedFields,
        };

        // Get all existing user modules and add the new one
        // This is an UPSERT API - must send all existing modules + new module
        const allModules = [
          ...(customModules || []), // All existing user modules
          newModulePayload, // New module
        ];

        const payload = {
          userId: userId,
          modules: allModules,
        };

        await dispatch(addModule(payload)).unwrap();

        // Refresh user's modules to get the newly created module with its ID
        const updatedModulesResponse = await dispatch(getModules(userId)).unwrap();

        // Find the newly created module by comparing old and new module lists
        // The newly added module will exist in the updated list but not in the old list
        const oldModuleIds = new Set(
          (customModules || []).map((module) => module.module_id)
        );
        
        const newlyCreatedModule = updatedModulesResponse?.modules?.find(
          (module) => !oldModuleIds.has(module.module_id)
        );

        if (newlyCreatedModule && newlyCreatedModule.module_id) {
          // Check if module already exists in the right pad
          const moduleExists = customizedPadRightList?.some(
            (item) => item.tmdpm_id === newlyCreatedModule.module_id
          );

          if (!moduleExists) {
            // Step 1: Sync print settings (add module to print settings)
            if (defaultPrintSettings?.prescription?.case_option) {
              const caseOptions = defaultPrintSettings.prescription.case_option;
              
              const updatedCaseOptions = [
                ...caseOptions,
                {
                  id: newlyCreatedModule.module_id,
                  title: newlyCreatedModule.name,
                  format: "table",
                  enable: "Y",
                  custom_status: "Y",
                  is_custom_module: true,
                },
              ];

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

            // Step 2: Add module to customized pad right list
            const updatedRightPad = [
              ...(customizedPadRightList || []),
              {
                tmdpm_id: newlyCreatedModule.module_id,
                tmdpm_name: newlyCreatedModule.name,
                tmdpm_short_name: newlyCreatedModule.name,
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
          }
        }

        // Refresh modules list by hospital (after all API calls complete)
        await dispatch(searchModulesByHospital({
          hospitalId,
          moduleName: "",
          page: 1,
          limit: 100,
          departmentId: profile?.dp_id
        })).unwrap();

        // Show success message only after ALL API calls complete
        if (newlyCreatedModule && newlyCreatedModule.module_id) {
          const moduleExists = customizedPadRightList?.some(
            (item) => item.tmdpm_id === newlyCreatedModule.module_id
          );
          
          if (!moduleExists) {
            message.success(
              `Module "${moduleData.moduleName}" created and added to your prescription pad!`
            );
          } else {
            message.success(
              `Module "${moduleData.moduleName}" created successfully!`
            );
          }
        } else {
          message.success(
            `Module "${moduleData.moduleName}" created successfully!`
          );
        }

        setConfirmModalOpen(false);
        // Close drawer after creation
        onClose();
        // Reset form data
        setCreateModuleFormData(null);
        // Reset to select tab
        setActiveTab("select");
        // Force remount of CreateNewModuleTab so its internal state (inputs) is cleared
        setCreateTabKey((prev) => prev + 1);
      } catch (error) {
        console.error("Error creating module:", error);
        const errorMessage =
          error?.message ||
          error?.error ||
          "Failed to create module. Please try again.";
        message.error(errorMessage);
      } finally {
        // Always reset loading state, even if there's an error
        setIsCreatingModule(false);
      }
    },
    [dispatch, userId, onClose, customModules, hospitalId, customizedPadRightList, customizedPadLeftList, defaultPrintSettings, profile, isCreatingModule]
  );

  const handleFormChange = useCallback((formData) => {
    setCreateModuleFormData(formData);
  }, []);

  const isCreateButtonEnabled = useMemo(() => {
    if (activeTab !== "create") return false;
    return createModuleFormData?.isValid || false;
  }, [activeTab, createModuleFormData]);

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
          <h2 className="add-custom-module-drawer__title">Add Custom Module</h2>
        </div>
        {activeTab === "create" && (
          <Button
            type="primary"
            className="add-custom-module-drawer__create-button"
            disabled={!isCreateButtonEnabled || loading || isDisabled}
            loading={loading}
            onClick={handleCreateModule}
          >
            Create & Add To Rx
          </Button>
        )}
      </div>

      <div className="add-custom-module-drawer__tabs">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="add-custom-module-drawer__tabs-container"
        >
          <TabPane
            tab="Select Existing Module"
            key="select"
            className="add-custom-module-drawer__tab-pane"
          >
            <SelectExistingModuleTab
              onAddToRx={handleAddToRx}
              onViewMore={handleViewMore}
              drawerOpen={open}
            />
          </TabPane>
          <TabPane
            tab="Create New Module"
            key="create"
            className="add-custom-module-drawer__tab-pane"
          >
            <CreateNewModuleTab
              key={createTabKey}
              onCreateModule={handleCreateModule}
              onFormChange={handleFormChange}
            />
          </TabPane>
        </Tabs>
      </div>

      {/* Confirm Module Modal */}
      <ConfirmModuleModal
        open={confirmModalOpen}
        onClose={() => {
          // Prevent closing modal while creating module
          if (!isCreatingModule) {
            setConfirmModalOpen(false);
          }
        }}
        onConfirm={handleConfirmModule}
        moduleData={createModuleFormData}
        loading={isCreatingModule}
      />
    </Drawer>
  );
};

export default AddCustomModuleDrawer;
