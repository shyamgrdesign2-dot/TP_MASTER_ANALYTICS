import React from "react";
import { Tooltip } from "antd";
import { PlusOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { getDecodedToken } from "../../utils/localStorage";
import { getClinic } from "../../utils/utils";
import "./AddCustomModuleV2.scss";

const MAX_MODULES = 15;

/**
 * AddCustomModuleV2 Component
 *
 * Displays a button to add custom modules with module count information.
 *
 * @param {Function} onOpenDrawer - Callback function to open the drawer when button is clicked
 */
const AddCustomModuleV2 = ({ onOpenDrawer }) => {
  const { customModules } = useSelector((state) => state.customModules);
  const { userId, profile } = useSelector((state) => state.doctors);
  // Filter out cloned modules (modules with origin_id) - only count user-created modules
  const userCreatedModules = customModules?.filter((module) => !module.origin_id) || [];
  const moduleCount = userCreatedModules.length;
  const isDisabled = moduleCount >= MAX_MODULES;
  const decodedToken = getDecodedToken();
  const clinic = getClinic(profile?.hospital_data);

  const handleClick = () => {
    // Track MoEngage event for add custom module CTA click
    if (window.Moengage) {
      const moeData = {
        doctor_name: profile?.um_name || "",
        doctor_um_id: userId || "",
        specialty: profile?.dp_name || "",
        doctor_mobile_no: profile?.um_contact || "",
        sub_doctor: profile?.is_sub_doctor ? 1 : 0,
        hospital_id: clinic?.hm_id || decodedToken?.result?.clinic_id || "",
      };
      window.Moengage.track_event("TP_CMV2_AddModuleCTA", moeData);
    }
    
    if (onOpenDrawer) {
      onOpenDrawer();
    }
  };

  return (
    <div
      // className={`add-custom-module-v2 ${isDisabled ? "disabled" : ""}`}
      className={`add-custom-module-v2`}
      onClick={handleClick}
    >
      <div className="add-custom-module-v2__left">
        <PlusOutlined className="add-custom-module-v2__plus-icon" />
        <span className="add-custom-module-v2__text">Add Custom Module</span>
      </div>
      <div className="add-custom-module-v2__right">
        <span className="add-custom-module-v2__count">
          {moduleCount}/{MAX_MODULES} modules added
        </span>
        {/* <Tooltip
          title="You can create up to 10 custom modules. If you've reached the limit, delete an existing custom module to add a new one."
          placement="top"
          overlayClassName="add-custom-module-v2__tooltip"
        >
          <InfoCircleOutlined className="add-custom-module-v2__info-icon" />
        </Tooltip> */}
      </div>
    </div>
  );
};

export default AddCustomModuleV2;
