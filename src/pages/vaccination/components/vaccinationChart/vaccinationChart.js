import moment from "moment";
import VaccineTable from "../vaccineTable/VaccineTable";
import "./vaccinationChart.scss";
import { ASSETS } from "../../../../assets";

const columns = [
  {
    title: "Age",
    dataIndex: "age",
    key: "age",
    width: "8%",
  },
  {
    title: "Vaccine",
    dataIndex: "vaccine",
    key: "vaccine",
    width: "15%",
  },
  {
    title: "Brand",
    dataIndex: "brand",
    key: "brand",
    width: "15%",
  },
  {
    title: "Due Date",
    dataIndex: "dueDate",
    key: "dueDate",
    width: "16%",
  },
  {
    title: "Given Date",
    dataIndex: "givenDate",
    key: "givenDate",
    width: "16%",
  },
  {
    title: "Site",
    dataIndex: "site",
    key: "site",
    width: "10%",
  },
  {
    title: "Remarks",
    dataIndex: "remarks",
    key: "remarks",
    width: "20%",
  },
];

const VaccinationChart = ({ 
  vaccinesData, 
  patientDetails, 
  profile,
}) => {
  const dob = moment(patientDetails?.vac_dob, "DD-MMM-YYYY");
  const now = moment();

  // Calculate the difference in years
  const years = now.diff(dob, "years");
  dob.add(years, "years"); // Adjust DOB to account for the difference in years

  // Calculate the difference in months
  const months = now.diff(dob, "months");

  let ageString = "";

  if (years > 0 && months > 0) {
    ageString = `${years} Years ${months} Months`;
  } else if (years > 0 && months === 0) {
    ageString = `${years} Years`;
  } else if (months > 0) {
    ageString = `${months} Months`;
  }

  return (
    <div className="vaccination-chart">
      {vaccinesData?.length ? (
        <>
          {/* Header */}
          <div className="vaccination-header">
            <div className="header">Vaccination Chart</div>
            <div className="details">
              <img
                src={ASSETS.images.babyimage}
                alt="Baby"
                width={32}
                height={32}
              />
              <div style={{ height: "36px" }}>
                <div style={{ fontWeight: 600 }}>
                  {patientDetails?.vac_first_name}{" "}
                  {patientDetails?.vac_last_name}
                </div>
                <div>
                  {ageString ? `Age : ${ageString},` : ""} DOB :{" "}
                  {patientDetails?.vac_dob}, {patientDetails?.vac_gender}
                </div>
              </div>
            </div>
          </div>

          {/* Vaccine Table Section */}
          <div className="vaccine-table-section">
            <div className="vaccine-table-wrapper">
              <VaccineTable dataSource={vaccinesData} columns={columns} />
            </div>
            <p className="vaccine-footer-note">
              *Not needed if Rv1 is used **Not needed if live vaccine is used
              for first dose
            </p>
          </div>

          {/* Doctor Name */}
          <div className="nameStyle">{profile?.um_name}</div>
        </>
      ) : (
        <div className="noVaccineData">
          No vaccination has been given to this user
        </div>
      )}
    </div>
  );
};

export default VaccinationChart;
