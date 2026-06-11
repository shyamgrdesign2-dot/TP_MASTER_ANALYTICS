import { Button, Checkbox, Modal } from "antd";
import React from "react";

export default function PrintPopup({
  show,
  handleClose,
  graphsToPrint,
  setGraphToPrint,
  handlePrintWeb,
}) {
  const graphPrintHandler = (index, toggleBox) => {
    setGraphToPrint((prevState) => {
      const newState = [...prevState];
      newState[index] = {
        ...newState[index],
        isPrintEnabled: !toggleBox,
      };
      return newState;
    });
  };

  const continuePrintHandler = () => {
    handleClose();
    handlePrintWeb();
  };

  return (
    <Modal
      width="350px"
      height="254px"
      open={show}
      footer={null}
      closeIcon={null}
      title={
        <div>
          <div>Which all graphs you want to print?</div>
          <hr style={{ borderTop: "1px solid #ccc" }} />
        </div>
      }
      onCancel={handleClose}
    >
      <div
        style={{
          padding: "4px 0px",
        }}
      >
        {graphsToPrint.map((graphItem, index) => {
          return (
            <Checkbox
              key={index}
              className="growth-chart-custom-checkbox"
              checked={graphItem.isPrintEnabled}
              onChange={() =>
                graphPrintHandler(index, graphItem.isPrintEnabled)
              }
            >
              <span style={{ paddingRight: "12px" }}>{graphItem.label}</span>
            </Checkbox>
          );
        })}
        <Button
          type="button"
          className="btn-41 btn ant-btn-text btn-input"
          style={{ width: "100%", marginTop: "28px" }}
          onClick={continuePrintHandler}
        >
          Continue Printing
        </Button>
      </div>
    </Modal>
  );
}
