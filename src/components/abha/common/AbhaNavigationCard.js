import { ASSETS } from "../../../assets";
const LeftArrow = ASSETS.images.leftArrow;


const AbhaNavigationCard = ({ label, icon, onClick }) => {
  const isClickable = typeof onClick === "function";

  const handleKeyDown = (event) => {
    if (!isClickable) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div className={`navigation_card_container${isClickable ? " clickable" : ""}`}>
      <div
        className="navigation_card"
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        <div className="naviagtion_label_container">
          <img src={icon} />
          <div className="navigation_card_label">{label}</div>
        </div>
        <img src={LeftArrow} />
      </div>
    </div>
  );
};

export default AbhaNavigationCard;
