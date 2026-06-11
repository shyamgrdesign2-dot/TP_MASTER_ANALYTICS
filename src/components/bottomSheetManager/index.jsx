import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "antd";
import BottomSheetWrapper from "../../common/BottomSheetWrapper";

import "./styles.scss";
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.images.closeBlackBg;

let triggerShow = null;
let triggerHide = null;

export const openBottomSheet = (config) => {
  triggerShow?.(config);
};

export const closeBottomSheet = () => {
  triggerHide?.();
};

const BottomSheetManager = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState({});

  const handleHide = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      config?.onClose?.();
      setConfig({});
    }, 300);
  }, [config]);

  useEffect(() => {
    triggerShow = (cfg) => {
      setConfig(cfg);
      setIsVisible(true);
    };
    triggerHide = handleHide;

    return () => {
      triggerShow = null;
      triggerHide = null;
    };
  }, [handleHide]);

  if (!isVisible) return null;

  const content = (
    <BottomSheetWrapper isGlobalVisible={isVisible} onOverlayClick={handleHide}>
      <div className="bs-container">
        {!config?.hideCloseBtn && (
          <div
            className="close-btn d-flex align-items-center justify-content-center"
            onClick={handleHide}
          >
            <img src={closeIcon} alt="close" />
          </div>
        )}
        {config.title && (
          <div className="fw-semibold fs-20 text-black bs-title">
            {config.title}
          </div>
        )}
        <div className="bs-content">
          {config.icon && <div className="bs-icon">{config.icon}</div>}
          {config.description && (
            <p className="bs-desc fs-14">{config.description}</p>
          )}
        </div>
        {config.ctaText && (
          <Button
            className="bs-cta fs-16 fw-semibold text-white"
            type="primary"
            size="large"
            onClick={() => {
              handleHide();
              config?.ctaClick?.();
            }}
          >
            {config.ctaText}
          </Button>
        )}
      </div>
    </BottomSheetWrapper>
  );

  return createPortal(content, document.body);
};

export default BottomSheetManager;
