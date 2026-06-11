import React, { useEffect, useState } from "react";
import { getAllGrowthChartParams } from "../../service";
import { useLocation, useNavigate } from "react-router-dom";

import { Card } from "react-bootstrap";
import { Button } from "antd";
import "./VisitGrowthChart.scss";
import moment from "moment";
import { UNITS, getAge } from "../../growthChartHelper";
import { useSelector } from "react-redux";
import { ASSETS } from "../../../../assets";
const growthChartImg = ASSETS.images.growthChartDark;

export default function VisitGrowthChart() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state || {};
  const { patient_data } = locationState;
  const { patients_details } = useSelector((state) => state.records);

  const [growthChartData, setGrowthChartData] = useState({});

  useEffect(() => {
    getGrowthChartDetails();
  }, []);

  const getGrowthChartDetails = async () => {
    const allGrowthChartParams = await getAllGrowthChartParams({
      pm_id: patient_data?.pm_id || 0,
      pm_pid: patient_data?.pm_pid || 0,
    });
    if (allGrowthChartParams?.length) {
      setGrowthChartData(allGrowthChartParams?.[0]);
    }
  };

  const measurementDetails = () => {
    const measurementData = {
      Height: `${growthChartData.height} ${UNITS.Height}`,
      Weight: `${growthChartData.weight} ${UNITS.Weight}`,
      BMI: `${growthChartData.bmi} ${UNITS.BMI}`,
      OFC: `${growthChartData.ofc} ${UNITS.OFC}`,
    };
    return (
      <div className="detailContainer">
        {Object.entries(measurementData).map(([key, value], index) => (
          <React.Fragment key={key}>
            <div className="measurementItem">
              <span className="keyStyle">{key}</span>
              <span>{value}</span>
            </div>
            {index !== 3 && <div className="dottedLineStyle" />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <>
      {!Object.keys(growthChartData)?.length ? null : (
        <div className="appointment-wrap PatientDetailswrap m-0">
          <Card>
            <Card.Header className="bg-white py-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <img
                    src={growthChartImg}
                    alt="Medical History"
                    className="me-3"
                  />
                  Growth
                </div>
                <Button
                  className="btn btn-input d-flex align-items-center gap-1"
                  onClick={() =>
                    navigate("/prescription", {
                      state: {
                        patient_data: patient_data,
                        chartType: "growthChart",
                        from: "/patient_details"
                      },
                    })
                  }
                >
                  <span>See Chart</span>
                  <i
                    className="icon-right iconrotatehistory90"
                    style={{ display: "block", transform: `rotate(180deg)` }}
                  />
                </Button>
              </div>
            </Card.Header>
            <div className="visitBody overflow-auto visitGrowthContainer">
              <div className="rowContainer">
                <span className="previousText">Previous visit</span>
                <span className="updatedText">
                  Updated on :{" "}
                  {moment(growthChartData.tcbc_created_date).format(
                    "DD MMM YYYY"
                  )}
                </span>
              </div>
              <div>
                {patients_details?.pm_dob &&
                  getAge(
                    growthChartData.tcbc_created_date,
                    patients_details?.pm_dob
                  )}
              </div>
              {measurementDetails()}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
