import React, { useMemo } from "react";
import { Tooltip } from "antd";
import { ASSETS } from "../../assets";
const alertIcon = ASSETS.images.alerticon;

/**
 * DisabledModuleTooltip
 *
 * Reusable tooltip for disabled "Edit Module Name" / "Delete Module" actions.
 * Shows:
 *  - Module Created by: <Doctor Name>
 *  - Note about module being used in Rx and cannot be edited/deleted
 *
 * Props:
 *  - module: module object (must have module_id, may have origin_id, creator_name, doctor_name)
 *  - hospitalSearchResults: optional, used to resolve creator name when not on module
 *  - children: element to wrap with tooltip
 *  - placement: tooltip placement (default: "left")
 */
const DisabledModuleTooltip = ({
  module,
  hospitalSearchResults,
  children,
  placement = "left",
  type = ""
}) => {
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

  const content = (
    <div className="module-disabled-tooltip__content">
      { type === "title" &&
        <div className="module-disabled-tooltip__header">
          <span className="module-disabled-tooltip__header-label">
            Module Created by:
          </span>{" "}
          <span className="module-disabled-tooltip__header-name">
            {creatorName}
          </span>
        </div>
      }
      <div className="module-disabled-tooltip__note">
        <img
          src={alertIcon}
          alt="Warning"
          className="module-disabled-tooltip__note-icon"
        />
        <div className="module-disabled-tooltip__note-text">
          <span className="module-disabled-tooltip__note-title">Note:</span>{" "}
          This module is used in an Rx and can’t be{" "}
          <span className="module-disabled-tooltip__note-strong">
            edited/deleted
          </span>
          . Create a new one if you need a different version
        </div>
      </div>
    </div>
  );

  return (
    <Tooltip
      title={content}
      placement={placement}
      overlayStyle={{ maxWidth: 420 }}
      overlayClassName="module-list-item-disabled-tooltip"
    >
      {children}
    </Tooltip>
  );
};

export default DisabledModuleTooltip;

