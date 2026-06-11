import React, { useCallback, useContext, useEffect, useState } from "react";
import { Tooltip, Input, Button, message } from "antd";
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import "./CustomModule.scss";

import { useDispatch, useSelector } from "react-redux";
import {
  addModule,
  getModuleContents,
  getModules,
} from "../redux/customModuleSlice";
import CashManagerContext from "../context/CashManagerContext";
import { MESSAGE_KEY } from "../utils/constants";

import { customizedPad } from "../redux/doctorsSlice";
import { savePrintsettings } from "../redux/doctorsSlice";
import { ASSETS } from "../assets";
const {
  customModule: CustomModuleIcon,
  infoCircle: infoCircleIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

const AddCustomModule = () => {
  const [showInput, setShowInput] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const dispatch = useDispatch();
  const { customModules } = useSelector((state) => state.customModules);
  const {
    userId,
    customizedPadRightList,
    customizedPadLeftList,
    defaultPrintSettings,
  } = useSelector((state) => state.doctors);

  const { setCustomModuleContents, tcmId } = useContext(CashManagerContext);

  // Define getCustomModuleContents before it's used
  const getCustomModuleContents = useCallback(async () => {
    const action = await dispatch(getModuleContents(tcmId));
    if (action.meta.requestStatus === "fulfilled") {
      setCustomModuleContents(
        action.payload.moduleContents?.filter(
          (e) => !!customModules.find((cm) => cm.module_id === e.module_id)
        )
      );
    }
  }, [tcmId, customModules, dispatch, setCustomModuleContents]);

  const syncPrintSettings = useCallback(() => {
    const customModuleMap = new Map(
      customModules.map((module) => [module.module_id, module.name])
    );

    let updateFlag = false;

    const updatedCaseOptions = [];

    // Process existing case_option
    (defaultPrintSettings?.prescription?.case_option || []).forEach(
      (option) => {
        if (option.is_custom_module) {
          const newName = customModuleMap.get(option.id);

          if (newName) {
            // Update name if it's different
            if (option.title !== newName) {
              updatedCaseOptions.push({
                ...option,
                title: newName, // Create a new object with updated title
              });
              updateFlag = true;
            } else {
              updatedCaseOptions.push(option); // Retain unchanged custom module
            }
            customModuleMap.delete(option.id); // Remove from map to avoid duplicate addition
          } else {
            updateFlag = true; // Custom module no longer exists, so it will be removed
          }
        } else {
          // Retain non-custom modules
          updatedCaseOptions.push(option);
        }
      }
    );

    // Add remaining custom modules from customModuleMap
    customModuleMap.forEach((name, moduleId) => {
      updatedCaseOptions.push({
        id: moduleId,
        title: name,
        format: "table",
        enable: "Y",
        custom_status: "Y",
        is_custom_module: true,
      });
      updateFlag = true;
    });

    if (updateFlag) {
      const rxPrescription = {
        ...defaultPrintSettings?.prescription,
        case_option: updatedCaseOptions,
      };

      const sendData = {
        ...defaultPrintSettings,
        prescription: JSON.stringify(rxPrescription),
        header_footer: JSON.stringify(defaultPrintSettings?.header_footer),
        page_format: JSON.stringify(defaultPrintSettings?.page_format),
      };

      dispatch(savePrintsettings(sendData));
    }
  }, [customModules, defaultPrintSettings, dispatch]);

  const syncRightRxPad = useCallback(() => {
    const customModuleMap = new Map(
      customModules.map((module) => [module.module_id, module.name])
    );

    let updateFlag = false;

    const updatedRightRxPad = [];

    (customizedPadRightList || []).forEach((option) => {
      if (option.is_custom_module) {
        const newName = customModuleMap.get(option.tmdpm_id);

        if (newName) {
          if (option.tmdpm_name !== newName) {
            updatedRightRxPad.push({
              ...option,
              tmdpm_name: newName,
              tmdpm_short_name: newName,
            });
            updateFlag = true;
          } else {
            updatedRightRxPad.push(option);
          }
          customModuleMap.delete(option.tmdpm_id);
        } else {
          updateFlag = true;
        }
      } else {
        updatedRightRxPad.push(option);
      }
    });

    customModuleMap.forEach((name, moduleId) => {
      updatedRightRxPad.push({
        tmdpm_id: moduleId,
        tmdpm_name: name,
        tmdpm_short_name: name,
        tmdpm_type: "R",
        tmdpm_status: 0,
        is_custom_module: true,
      });
      updateFlag = true;
    });

    if (updateFlag) {
      const sendData = {
        data: {
          default: false,
          reset: false,
          left: customizedPadLeftList,
          right: updatedRightRxPad,
        },
      };

      dispatch(customizedPad(sendData));
    }
  }, [customModules, customizedPadLeftList, customizedPadRightList, dispatch]);

  // useEffect hooks
  useEffect(() => {
    if (tcmId) {
      getCustomModuleContents();
    }
  }, [tcmId, getCustomModuleContents]);

  useEffect(() => {
    if (customModules?.length) {
      syncPrintSettings();
      syncRightRxPad();
    }
  }, [customModules, syncPrintSettings, syncRightRxPad]);

  useEffect(() => {
    dispatch(getModules(userId)).catch((error) =>
      message.error(error || "Failed to fetch modules.")
    );
  }, [userId, dispatch]);

  const handleAddModule = async () => {
    if (!newModuleName.trim()) {
      message.error("Module name cannot be empty.");
      return;
    }
    if (customModules.some((cm) => cm.name === newModuleName.trim())) {
      message.error("Module name already exists.");
      return;
    }
    if (customModules.length >= 10) {
      message.error("You can only add up to 10 custom modules.");
      return;
    }

    try {
      const action = await dispatch(
        addModule({
          userId,
          modules: [
            ...customModules,
            {
              name: newModuleName,
              templates: [],
            },
          ],
        })
      );
      if (action.meta.requestStatus === "fulfilled") {
        setShowInput(false);
        message.open({
          key: MESSAGE_KEY,
          type: "",
          className: "message-appointment",
          content: (
            <div className="d-flex align-items-center">
              <img src={visitEnd} className="me-3" alt="Success" />
              <div>
                <div className="title-common text-start fontroboto">{`${newModuleName} module has been created successfully.`}</div>
              </div>
              <img
                src={imgCloseVisit}
                className="ms-3"
                alt="Close"
                onClick={() => message.destroy()}
              />
            </div>
          ),
          duration: 3,
        });
        setNewModuleName("");
      }
    } catch (error) {
      message.error(error || "Failed to add module.");
    }
  };

  const handleCancel = () => {
    setShowInput(false);
    setNewModuleName("");
  };

  return (
    <div className="add-custom-module-cta-container">
      {showInput && (
        <div className="custom-module-input-container">
          <img className="me-2" src={CustomModuleIcon} alt="Custom Module" />
          <Input
            placeholder="Enter custom module name"
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
            className="custom-module-input"
          />
          <>
            <CheckOutlined
              className="input-action-icon tick-icon"
              onClick={handleAddModule}
            />
            <CloseOutlined
              className="input-action-icon cross-icon"
              onClick={handleCancel}
            />
          </>
        </div>
      )}

      {/* Add Custom Module CTA */}
      <div className="cta-container" onClick={() => setShowInput(true)}>
        <Button
          type="link"
          icon={<PlusOutlined />}
          className="add-custom-module-link"
          disabled={(customModules?.length || 0) >= 10}
        >
          Add Custom Module
        </Button>
        <div className="module-info">
          <span className="module-count">{`${customModules?.length || 0}/10 modules added`}</span>
          <Tooltip
            title="You can create up to 10 custom modules. If you've reached the limit, delete an existing custom module to add a new one."
            placement="top"
            className="info-tooltip"
          >
            <img src={infoCircleIcon} alt="Info" className="info-icon" />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default AddCustomModule;
