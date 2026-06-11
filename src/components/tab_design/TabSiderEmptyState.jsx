import React from "react";
import { Button } from "antd";
import { ASSETS } from "../../assets";
const emptyFileIllustration = ASSETS.images.emptyFile;

const TabSiderEmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="tab-rx-sider-empty">
      <img
        src={emptyFileIllustration}
        alt={title}
        className="tab-rx-sider-empty__illustration"
      />
      <div className="tab-rx-sider-empty__content">
        <div className="tab-rx-sider-empty__title">{title}</div>
        <div className="tab-rx-sider-empty__description">{description}</div>
      </div>
      <Button
        className="btn btn-primary3 btn-text-white d-flex align-items-center justify-content-center tab-rx-sider-empty__button"
        onClick={onAction}
      >
        <i className="icon-Add me-2 fs-21"></i>
        {actionLabel}
      </Button>
    </div>
  );
};

export default TabSiderEmptyState;
