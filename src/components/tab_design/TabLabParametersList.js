import { Button, Divider } from "antd";
import React, { useEffect, useState } from "react";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import TabSiderEmptyState from "./TabSiderEmptyState";

const TabLabParametersList = ({ handleCollapsed, labParamsData, handleAddLabParamsDrawer, handleViewLabParamsDrawer, isTabRx }) => {

  const [labParamsdeatils, setLabParamsdeatils] = useState([]);
  const hasLabParams = labParamsData?.length > 0;

  useEffect(() => {
    const updatedLabParamsData= labParamsData?.sort((a, b) => new Date(b.date) - new Date(a.date))
    setLabParamsdeatils(updatedLabParamsData?.[0]);
  }, [labParamsData]);

  const measurementDetails = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", rowGap: "16px" }}>
        <div style={{ fontSize: "14px", fontWeight: "600" }}>
          {dayjs(labParamsdeatils?.date).format("DD MMM, YYYY")}
        </div>
        {labParamsdeatils?.inputs
          ?.filter((labParamItem) => labParamItem?.testName !== "Remarks") // Filter out "Remarks"
          .map((labParamItem, index) => {
          return (
            <React.Fragment key={index}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: "400" }}>{`${labParamItem?.testName} ${
                  labParamItem?.units ? `(${labParamItem?.units})` : ""
                }`}</div>
                <div
                  className={`${
                    labParamItem?.arrowDirection === "up" ||
                    labParamItem?.arrowDirection === "down"
                      ? "lab-params-warning"
                      : ""
                  } ${labParamItem?.name === "Remarks" ? "remarks-style" : ""}`}
                  style={{ fontWeight: "400", width: "24%", textAlign: "end" }}
                >
                  {labParamItem?.arrowDirection === "up" ? (
                    <ArrowUpOutlined
                      className="lab-params-warning"
                      style={{ paddingLeft: 5 }}
                    />
                  ) : labParamItem?.arrowDirection === "down" ? (
                    <ArrowDownOutlined
                      className="lab-params-warning"
                      style={{ paddingLeft: 5 }}
                    />
                  ) : null}
                  {labParamItem?.value}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className={`text-white align-items-center bg-secondary d-flex justify-content-between lh-lg px-2 py-2 ${isTabRx ? 'tab-rx-header' : ''}`}>
        Lab Results
        <Button
          type="text"
          className="btn p-0 btn-outline"
          onClick={handleCollapsed}
        >
          <i className="icon-Contract fs-21 text-white p-0"></i>
        </Button>
      </div>
      <div
        className="overflow-y-auto"
        style={{ height: "calc(100vh - 108px)" }}
      >
        <div className="p-10">
          {hasLabParams ? (
            <>
              <Button
                className="btn btn-input d-flex w-100 align-items-center justify-content-center btn-41"
                onClick={handleAddLabParamsDrawer}
              >
                <i className="icon-Add me-2 fs-21"></i>
                Add or Edit
              </Button>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  rowGap: "16px",
                  padding: "16px 0",
                }}
              >
                {measurementDetails()}
              </div>
              <Divider dashed style={{ color: "#D0D5DD", margin: "0 0 16px" }} />
              <div
                className="d-flex align-items-center"
                onClick={handleViewLabParamsDrawer}
              >
                <span className="view-all-txt">View All</span>
                <i className="icon-right view-all-icon" />
              </div>
            </>
          ) : (
            <TabSiderEmptyState
              title="No Lab Results!"
              description="It looks like there are no lab results added for this patient yet."
              actionLabel="Add Lab Results"
              onAction={handleAddLabParamsDrawer}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TabLabParametersList;
