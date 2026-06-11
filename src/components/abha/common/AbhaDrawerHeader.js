import { Button } from "antd";

const AbhaDrawerHeader = ({
  isNextButton,
  onNext,
  isLoading,
  isNextDisable,
  headerText,
  headerIcon,
  nextBtnTitle,
  onClose, // NEW
  showCloseButton, // NEW
}) => {
  return (
    <div className="abha_drawer_header">
      <h1 className="abha_drawer_header_text">
        {showCloseButton && onClose && (
          <button
            className="abha_close_button"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <i className="icon-close" style={{ fontSize: "20px", marginRight: "8px" }}></i>
          </button>
        )}
        {headerText}
        {headerIcon}
      </h1>
      {isNextButton && (
        <Button
          type="primary"
          onClick={onNext}
          loading={isLoading}
          disabled={isNextDisable}
          className={"abha_next_button"}
        >
          {nextBtnTitle}
        </Button>
      )}
    </div>
  );
};

export default AbhaDrawerHeader;
