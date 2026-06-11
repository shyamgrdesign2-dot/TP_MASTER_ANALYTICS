import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { mergeDefaultAndDoctorList } from "../../utils/helper";
import moment from "moment";

const AncImmunisationList = ({ handleDrawerObstetric }) => {
  const {
    obstetricDetails,
    defaultAncSchedule,
    defaultImmunisation,
    ancDoctorList,
    immunisationDoctorList,
  } = useSelector((state) => state.obstetric);
  const { userId } = useSelector((state) => state.doctors);

  const [immunisationHistory, setImmunisationHistory] = useState([]);
  const [ancHistory, setAncHistory] = useState([]);

  const showValidAncHistory = ancHistory.filter(
    (item) =>
      !item?.deleted &&
      (item?.dueDate ||
        item?.status === "Completed" ||
        item?.notes ||
        item?.enablePrint)
  );

  const showValidImmunisation = immunisationHistory.filter(
    (item) =>
      !item?.deleted &&
      (item?.givenDate ||
        item?.status === "Given" ||
        item?.notes ||
        item?.enablePrint)
  );

  useEffect(() => {
    const newImmunisationHistory = mergeDefaultAndDoctorList(
      obstetricDetails?.currentPregnancy?.immunisationHistory || [],
      defaultImmunisation,
      immunisationDoctorList,
      userId
    );
    setImmunisationHistory(newImmunisationHistory);

    const newAncHistory = mergeDefaultAndDoctorList(
      obstetricDetails?.currentPregnancy?.ancHistory || [],
      defaultAncSchedule,
      ancDoctorList,
      userId,
      true
    );
    setAncHistory(newAncHistory);
  }, [obstetricDetails?.currentPregnancy]);

  return (
    <div>
      {showValidAncHistory?.length > 0 && (
        <div
          className="cardbody-data border rounded"
          style={{ padding: "0 14px", marginTop: "8px" }}
        >
          <div className="mt-2 d-flex flex-column">
            <div className="d-flex justify-content-between">
              <div style={{ fontWeight: 600, marginBottom: 14 }}>
                ANC Scheduler
              </div>
              <div>
                <i
                  className="icon-Edit me-1 fs-5"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleDrawerObstetric("ancScheduler")}
                />
              </div>
            </div>
            <ol
              style={{
                listStyle: "none",
                fontSize: 12,
                fontWeight: 500,
                paddingLeft: 0,
              }}
            >
              {showValidAncHistory?.map((item, index) => {
                if (
                  !item?.deleted &&
                  (item?.dueDate ||
                    item?.status === "Completed" ||
                    item?.notes ||
                    item?.enablePrint)
                ) {
                  return (
                    <li key={index} style={{ fontWeight: 400 }}>
                      <span style={{ fontWeight: 500 }}>{index + 1}. </span>
                      <span style={{ fontWeight: 500 }}>
                        {item?.master?.name}
                      </span>{" "}
                      (
                      {item.dueDate
                        ? "Due Date from " +
                          moment(item?.dueDate).format("DD/MM/YYYY")
                        : ""}
                      {item.dueDate && item.status ? ", " : ""}
                      {item.status ?? ""}
                      {(item.status || item.dueDate) && item.notes ? ", " : ""}
                      {item.notes ?? ""})
                    </li>
                  );
                }
              })}
            </ol>
          </div>
        </div>
      )}

      {showValidImmunisation?.length > 0 && (
        <div
          className="cardbody-data border rounded"
          style={{ padding: "0 14px", marginTop: "8px" }}
        >
          <div className="mt-2 d-flex flex-column">
            <div className="d-flex justify-content-between">
              <div style={{ fontWeight: 600, marginBottom: 14 }}>
                Immunisation Vaccines
              </div>
              <div>
                <i
                  className="icon-Edit me-1 fs-5"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleDrawerObstetric("immunisationHistory")}
                />
              </div>
            </div>
            <ol
              style={{
                listStyle: "none",
                fontSize: 12,
                fontWeight: 500,
                paddingLeft: 0,
              }}
            >
              {showValidImmunisation?.map((item, index) => {
                if (
                  !item?.deleted &&
                  (item?.givenDate ||
                    item?.status === "Given" ||
                    item?.notes ||
                    item?.enablePrint)
                ) {
                  return (
                    <li key={index} style={{ fontWeight: 400 }}>
                      <span style={{ fontWeight: 500 }}>{index + 1}. </span>
                      <span style={{ fontWeight: 500 }}>
                        {item?.master?.name}
                      </span>{" "}
                      ({item?.status}
                      {item?.notes ? ", " + item?.notes : ""})
                    </li>
                  );
                }
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
export default React.memo(AncImmunisationList);
