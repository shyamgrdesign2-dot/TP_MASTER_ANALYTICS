import { useSelector } from "react-redux";
import { AncPrintedColumns } from "../../utils/constants";
import AncSchedulerTable from "./AncSchedulerTable";

const AncSchedulerChart = ({ selectedPrintData }) => {
  const { patients_details } = useSelector((state) => state.records);
  const ageString = `${
    patients_details?.ageYears ? patients_details?.ageYears + " Years" : ""
  } ${
    patients_details?.ageMonths ? patients_details?.ageMonths + " Months" : ""
  }`;
  return (
    <div>
      <div
        className="d-flex flex-column align-items-center print-template"
        style={{ fontFamily: "Poppins" }}
      >
        <div className="header text-welcome">ANC Scheduler</div>
        <div className="details">
          <div style={{ height: "36px" }}>
            <div className="text-welcome">
              <b style={{ fontWeight: 600 }}>Name:</b>{" "}
              {patients_details?.pm_fullname}
            </div>
            <div className="text-welcome">
              <b style={{ fontWeight: 600 }}>Age/Gender:</b>{" "}
              {ageString ? `${ageString}, ` : ""}
              {patients_details?.pm_gender}
            </div>
          </div>
        </div>
        <div className="vaccine-table-wrapper">
          <AncSchedulerTable
            dataSource={selectedPrintData}
            columns={AncPrintedColumns}
          />
        </div>
      </div>
    </div>
  );
};

export default AncSchedulerChart;
