import React from "react";
import { useSelector } from "react-redux";
import TableView from "../tableView/TableView";
import { Row } from "react-bootstrap";
import moment from "moment";
import { isBrowser } from "react-device-detect";
import { ASSETS } from "../../../../assets";

export default function GrowthChartPrint({
  dataSource,
  getGraphs,
  isTableprint,
}) {
  const { profile } = useSelector((state) => state.doctors);
  const { patients_details } = useSelector((state) => state.records);
  const pageData = isTableprint
    ? [[1]]
    : [getGraphs().slice(0, 4), getGraphs().slice(4)];
  const ageString = `${
    patients_details?.ageYears ? patients_details?.ageYears + " Years" : ""
  } ${
    patients_details?.ageMonths ? patients_details?.ageMonths + " Months" : ""
  }`;

  return (
    <>
      {pageData.map(
        (data, index) =>
          !!data?.length && (
            <div key={index} className="d-flex flex-column align-items-center">
              <div
                className="header"
                style={{ marginTop: isBrowser ? "20px" : "0" }}
              >
                Growth Chart
              </div>
              <div className="details">
                <img
                  src={ASSETS.images.babyimage}
                  alt="Baby"
                  width={32}
                  height={32}
                />
                <div style={{ height: "36px" }}>
                  <div style={{ fontWeight: 600 }}>
                    {patients_details?.pm_fullname}
                  </div>
                  <div>
                    {ageString ? `Age : ${ageString},` : ""}
                    {patients_details?.pm_dob
                      ? `DOB : ${moment(patients_details.pm_dob).format(
                          "DD-MM-YYYY"
                        )}`
                      : ""}
                    ,{patients_details?.pm_gender}
                  </div>
                </div>
              </div>
              <div className="vaccine-table-wrapper">
                {isTableprint ? (
                  <TableView dataSource={dataSource} />
                ) : (
                  <div
                    className="graphsWrapper"
                    style={{ padding: "0", overflow: "hidden" }}
                  >
                    <Row sm={2} md={2} lg={2} className="gy-4">
                      {data}
                    </Row>
                  </div>
                )}
                {index === pageData?.length - 1 && (
                  <div className="nameStyle" style={{ padding: 0 }}>
                    {profile?.um_name}
                  </div>
                )}
              </div>
            </div>
          )
      )}
    </>
  );
}
