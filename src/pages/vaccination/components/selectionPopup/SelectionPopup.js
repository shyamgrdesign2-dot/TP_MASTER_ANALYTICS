import React from "react";
import { Button } from "antd";
import "./SelectionPopup.scss";

const SelectionPopup = ({
  visible,
  onClose,
  selectedValue,
  setSelectedCards,
  setShowUpdate,
  setWarningMsg,
}) => {
  const handleClear = () => {
    setSelectedCards([]);
    setWarningMsg("");
    onClose();
  };

  const handleUpdate = () => {
    setShowUpdate(true);
  };

  return (
    <div className={`customDrawer ${visible ? "open" : "closed"}`}>
      <div className="drawerContainer">
        <span className="selectedStyle">{selectedValue} Selected</span>
        <Button
          shape="round"
          size="large"
          className="btnStyle"
          onClick={handleClear}
        >
          <span className="clearStyle">Clear</span>
        </Button>
        <Button
          size="large"
          shape="round"
          type="primary"
          onClick={handleUpdate}
        >
          <span>Update Vaccine{selectedValue > 1 ? "s" : ""}</span>
        </Button>
      </div>
    </div>
  );
};

export default React.memo(SelectionPopup);
