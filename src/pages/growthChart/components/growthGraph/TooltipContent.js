
import "./GrowthGraph.scss";
import { getAge } from "../../growthChartHelper";
import moment from "moment";
import { useSelector } from "react-redux";
import { ASSETS } from "../../../../assets";
const closeFill = ASSETS.images.closefill;

const TooltipContent = ({ handleDrawerVital, handleCloseTooltip, data }) => {
  const { patients_details } = useSelector((state) => state.records);
  return (
    <div className="tooltipStyle">
      <div className="measurementHeader">
        <div className="rowContainer">
          <div>
            <span className="measurementText">Measurements</span>
            <i
              className="icon-Edit iconStyle"
              onClick={() => handleDrawerVital(data)}
            />
          </div>
          <img
            src={closeFill}
            alt="close"
            className="closeImg"
            onClick={handleCloseTooltip}
          />
        </div>
        <div className="rowContainer">
          <div>
            Age: {getAge(data.tcbc_created_date, patients_details?.pm_dob)}
          </div>
          <div className="updateText">
            Updated: {moment(data?.tcbc_created_date).format("DD MMM YYYY")}
          </div>
        </div>
      </div>

      <div className="measurements">
        <div className="rowContainer">
          <div className="measurement">
            <span className="measurementKey">Height : </span>
            {data?.height} cms
          </div>
          <span className="breakStyle" />
          <div>
            <span>Weight : </span>
            {data?.weight} kg
          </div>
        </div>
        <div className="rowContainer">
          <div>
            <span>BMI : </span>
            {data?.bmi} kg/m2
          </div>
          <span className="breakStyle" />
          <div>
            <span>OFC : </span>
            {data?.ofc} cms
          </div>
        </div>
      </div>
      <span className="tooltipArrow" />
    </div>
  );
};

export default TooltipContent;
