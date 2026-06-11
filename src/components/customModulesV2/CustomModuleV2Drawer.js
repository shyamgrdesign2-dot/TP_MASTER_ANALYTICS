import React, { useState } from "react";
import { Drawer, Button } from "antd";
import CustomModuleFieldTextAreaAutoComplete from "./CustomModuleFieldTextAreaAutoComplete";

/**
 * Drawer view for tablet/mobile editing of Custom Module rows.
 * Matches the provided Figma design and works for both add & edit.
 */
const CustomModuleV2Drawer = ({
  open,
  width = 563,
  moduleName,
  fields = [],
  values = {},
  onFieldChange,
  onClose,
  onSave,
  moduleId,
  templates = [],
}) => {
  const [focusedFieldId, setFocusedFieldId] = useState(null);
  return (
    <Drawer
      open={open}
      width={width}
      placement="right"
      destroyOnClose
      closable={false}
      maskClosable
      onClose={onClose}
      className="custom-module-v2-drawer"
      bodyStyle={{ padding: 0 }}
    >
      <div className="custom-module-v2-drawer__header">
        <button
          type="button"
          className="icon-btn"
          aria-label="Close drawer"
          onClick={onClose}
        >
          <i className="icon-Cross" />
        </button>
        <div className="custom-module-v2-drawer__title">{moduleName}</div>
        <Button
          type="primary"
          className="custom-module-v2-drawer__save"
          onClick={onSave}
        >
          Save
        </Button>
      </div>

      <div className="custom-module-v2-drawer__body">
        {fields?.map((field, idx) => (
          <div key={field.fieldName} className="custom-module-v2-drawer__field">
            <label className="custom-module-v2-drawer__label">
              {field.fieldLabel}
            </label>
            <CustomModuleFieldTextAreaAutoComplete
              fieldName={field.fieldName}
              fieldLabel={field.fieldLabel}
              value={values?.[field.fieldName] || ""}
              onChange={(value) => onFieldChange(field.fieldName, value)}
              moduleId={moduleId}
              templates={templates}
              className="custom-module-v2-drawer__input w-100"
              autoFocus={idx === 0}
              fieldId={`drawer-${field.fieldName}`}
              focusedFieldId={focusedFieldId}
              onFocusChange={setFocusedFieldId}
            />
          </div>
        ))}
      </div>
    </Drawer>
  );
};

export default CustomModuleV2Drawer;
