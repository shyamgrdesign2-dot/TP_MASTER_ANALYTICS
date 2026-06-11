import React, { forwardRef, useImperativeHandle, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./BottomSheetWrapper.scss";

const BottomSheetWrapper = forwardRef((props, ref) => {
  const {
    children,
    className,
    overlayClassName,
    onOverlayClick,
    isGlobalVisible,
  } = props;
  const [isVisible, setIsVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    show: () => setIsVisible(true),
    hide: () => setIsVisible(false),
  }));

  return (
    <AnimatePresence>
      {(isVisible || isGlobalVisible) && (
        <div className="bottomSheetWrapper">
          <div
            className={overlayClassName || "overlay"}
            onClick={onOverlayClick || (() => setIsVisible(false))}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={className || "bottomSheet"}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

export default BottomSheetWrapper;
