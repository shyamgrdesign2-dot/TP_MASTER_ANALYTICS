import { Collapse, Divider } from "antd";
import React, { useEffect, useState } from "react";
import ReadMore from "../../../../common/ReadMore";
import { useSelector } from "react-redux";
import moment from "moment";
import { isPrimigravida } from "../../utils/helper";
import PatientInfoList from "./PatientInfoList";
import AncImmunisationList from "./AncImmunisationList";

const ObstetricList = ({ handleDrawerObstetric }) => {
  const { obstetricDetails: allObstetricDetails } = useSelector(
    (state) => state.obstetric
  );
  const obstetricDetails = allObstetricDetails?.currentPregnancy || {};
  const { examinationHistory } = obstetricDetails || [];
  const [accordionItems, setAccordionItems] = useState([]);
  const [infoAccordionItems, setInfoAccordionItems] = useState([]);

  const shouldShowAncHistory = obstetricDetails?.ancHistory?.find(
    (item) =>
      !item?.deleted &&
      (item?.dueDate ||
        item?.status === "Completed" ||
        item?.notes ||
        item?.enablePrint)
  );

  const shouldShowImmunisation = obstetricDetails?.immunisationHistory?.find(
    (item) =>
      !item?.deleted &&
      (item?.givenDate ||
        item?.status === "Given" ||
        item?.notes ||
        item?.enablePrint)
  );

  const today = moment();
  const lmpDate = obstetricDetails?.lmp ? moment(obstetricDetails.lmp) : null;

  let gestationWeeks = null;
  let gestationDays = null;

  if (obstetricDetails?.ceed) {
    const gestationAge =
      40 * 7 -
      Math.ceil(
        Math.abs(
          moment(obstetricDetails?.ceed)
            .startOf("day")
            .diff(moment(today).startOf("day"), "days")
        )
      );

    // Convert to weeks and days
    gestationWeeks = Math.floor(gestationAge / 7);
    gestationDays = gestationAge % 7;
  } else if (lmpDate) {
    gestationWeeks = today.diff(lmpDate, "weeks");
    const adjustedLmpDate = lmpDate.clone().add(gestationWeeks, "weeks");
    gestationDays = today.diff(adjustedLmpDate, "days");
  }

  useEffect(() => {
    const accordionItemsData = examinationHistory?.map((visitItem, i) => ({
      key: i,
      label: (
        <div className="fw-semibold">
          {`Visit ${examinationHistory.length - i}`}
        </div>
      ),
      content: (
        <div>
          <div
            className="cardbody-data mt-2 border visitItem"
            style={{ borderRadius: "8px", padding: "5px 15px" }}
          >
            <div className="my-2">
              {typeof visitItem.pallor === "boolean" ? (
                <>
                  <span>Pallor : </span>
                  <label>{`${visitItem.pallor ? " Yes " : " No "}`}</label>
                  {typeof visitItem.oedema === "boolean" || visitItem.mothersBMI
                    ? " | "
                    : ""}
                </>
              ) : null}
              {typeof visitItem.oedema === "boolean" ? (
                <>
                  <span>Oedema : </span>
                  <label>{`${visitItem.oedema ? " Yes " : " No "}`}</label>
                  {visitItem.mothersBMI ? " | " : ""}
                </>
              ) : null}
              {visitItem.mothersHeight ? (
                <>
                  <span>Height : </span>
                  <label>{visitItem.mothersHeight} cm</label>
                </>
              ) : null}
              {visitItem.mothersWeight ? (
                <>
                  <span>Weight : </span>
                  <label>{visitItem.mothersWeight} kg</label>
                </>
              ) : null}
              {visitItem.mothersBMI ? (
                <>
                  <span>BMI : </span>
                  <label>{visitItem.mothersBMI} kg/m2</label>
                </>
              ) : null}
            </div>
            <div className="my-2">
              {visitItem.systolic ? (
                <>
                  <span>Systolic : </span>
                  <label>{visitItem.systolic} mmHg</label>
                  {visitItem.diastolic ? " | " : ""}
                </>
              ) : null}
              {visitItem.diastolic ? (
                <>
                  <span>Diastolic : </span>
                  <label>{visitItem.diastolic} mmHg</label>
                </>
              ) : null}
            </div>
            <div className="my-2">
              {visitItem.heightOfFundus ? (
                <>
                  <span>Fundus : </span>
                  <label>
                    {visitItem.heightOfFundus}{" "}
                    {visitItem.heightOfFundusUnit ?? ""}
                  </label>
                  {visitItem.presentation ? " | " : ""}
                </>
              ) : null}
              {visitItem.presentation ? (
                <>
                  <span>Presentation : </span>
                  <label>{visitItem.presentation}</label>
                </>
              ) : null}
            </div>
            <div className="my-2">
              {visitItem.liquor ? (
                <>
                  <span>Liquor : </span>
                  <label>{visitItem.liquor}</label>
                  {visitItem.foetalHeartRate ? " | " : ""}
                </>
              ) : null}
              {visitItem.foetalHeartRate ? (
                <>
                  <span>FHR : </span>
                  <label>{visitItem.foetalHeartRate} BPM</label>
                </>
              ) : null}
            </div>
          </div>
          {visitItem?.notes?.length ? (
            <div
              className="cardbody-data mt-2 border visitItem"
              style={{ borderRadius: "8px", padding: "5px 15px" }}
            >
              <ReadMore text={visitItem.notes} textLimit={100} />
            </div>
          ) : null}
        </div>
      ),
    }));
    const { gravidity, livingChildren, parity, abortion, ectopicPregnancies } =
      obstetricDetails || {};
    const isprimigravida = isPrimigravida([
      { key: "gravidity", value: gravidity },
      { key: "livingChildren", value: livingChildren },
      { key: "parity", value: parity },
      { key: "abortion", value: abortion },
      { key: "ectopicPregnancies", value: ectopicPregnancies },
    ]);
    const data = [];
    const hasGravidity =
      obstetricDetails?.gravidity != null && obstetricDetails?.gravidity >= 0;
    const hasParity =
      obstetricDetails?.parity != null && obstetricDetails?.parity >= 0;
    const hasLivingChildren =
      obstetricDetails?.livingChildren != null &&
      obstetricDetails?.livingChildren >= 0;
    const hasAbortion =
      obstetricDetails?.abortion != null && obstetricDetails?.abortion >= 0;
    const hasEctopicPregnancies =
      obstetricDetails?.ectopicPregnancies != null &&
      obstetricDetails?.ectopicPregnancies >= 0;
    const hasDiagnosisNotes = obstetricDetails.diagnosisNotes?.length > 0;
    const hasGplae =
      hasGravidity ||
      hasParity ||
      hasLivingChildren ||
      hasAbortion ||
      hasEctopicPregnancies;
    const hasPatientInfo = hasGplae || hasDiagnosisNotes;
    const updateData = {
      key: `${1}`,
      content: (
        <div className="cardbody-data border rounded px-2 my-2">
          <div className="my-2">
            {(obstetricDetails.lmp ||
              obstetricDetails.edd ||
              obstetricDetails.ceed) && (
              <>
                <span>Patient Info:</span>{" "}
                {obstetricDetails.lmp && (
                  <>
                    <span>LMP</span> :{" "}
                    <label>
                      {moment(obstetricDetails.lmp).format("DD MMM YYYY")}
                    </label>{" "}
                  </>
                )}
                {obstetricDetails.lmp &&
                  (obstetricDetails.edd || obstetricDetails.ceed) &&
                  " | "}
                {(obstetricDetails.edd || obstetricDetails.ceed) && (
                  <>
                    <span>{obstetricDetails.ceed ? "CEDD" : "EDD"}</span> :{" "}
                    <label>
                      {moment(
                        obstetricDetails.ceed || obstetricDetails.edd
                      ).format("DD MMM YYYY")}
                    </label>{" "}
                  </>
                )}
                {(obstetricDetails.edd || obstetricDetails.ceed) &&
                  (gestationDays > 0 || gestationWeeks > 0) &&
                  " | "}
                {(gestationDays > 0 || gestationWeeks > 0) && (
                  <>
                    <span>{"Gestation"}</span> :{" "}
                    <label>
                      {gestationWeeks
                        ? `${gestationWeeks} ${
                            gestationWeeks > 1 ? "Weeks" : "Week"
                          } ${gestationDays ? " & " : ""}`
                        : ""}
                      {gestationDays
                        ? `${gestationDays} ${
                            gestationDays > 1 ? " Days" : " Day"
                          }`
                        : ""}
                    </label>
                  </>
                )}
              </>
            )}
          </div>
          {hasPatientInfo && (
            <div className="my-2 d-flex align-items-center flex-wrap">
              {hasGplae && (
                <>
                  <span style={{ marginRight: 5 }}>GPLAE (</span>
                </>
              )}
              {hasGravidity && (
                <>
                  {isprimigravida ? (
                    <span style={{ marginRight: 5 }}>Primigravida</span>
                  ) : (
                    <div style={{ marginRight: 5 }}>
                      <span>G</span> :{" "}
                      <label>{obstetricDetails.gravidity}</label>
                    </div>
                  )}
                  {(hasParity ||
                    hasLivingChildren ||
                    hasAbortion ||
                    hasEctopicPregnancies ||
                    hasDiagnosisNotes) &&
                    " | "}
                </>
              )}
              {!isprimigravida && hasParity && (
                <div className="mx-1">
                  <span>P</span> : <label>{obstetricDetails.parity}</label>
                  {(hasLivingChildren ||
                    hasAbortion ||
                    hasEctopicPregnancies ||
                    hasDiagnosisNotes) &&
                    " | "}
                </div>
              )}
              {!isprimigravida && hasLivingChildren && (
                <div className="mx-1">
                  <span>L</span> :{" "}
                  <label>{obstetricDetails.livingChildren}</label>
                  {(hasAbortion ||
                    hasEctopicPregnancies ||
                    hasDiagnosisNotes) &&
                    " | "}
                </div>
              )}
              {!isprimigravida && hasAbortion && (
                <div className="mx-1">
                  <span>A</span> : <label>{obstetricDetails.abortion}</label>
                  {(hasEctopicPregnancies || hasDiagnosisNotes) && " | "}
                </div>
              )}
              {!isprimigravida && hasEctopicPregnancies && (
                <div className="mx-1">
                  <span>E</span> :{" "}
                  <label>{obstetricDetails.ectopicPregnancies}</label>
                  {hasDiagnosisNotes && " | "}
                </div>
              )}
              {hasDiagnosisNotes ? (
                <>
                  <span className={`${hasGplae ? "mx-1" : "me-1"}`}>
                    Notes :
                  </span>{" "}
                  <ReadMore
                    text={obstetricDetails?.diagnosisNotes}
                    textLimit={100}
                    labelSize={14}
                    isInfo={hasGplae}
                  />
                </>
              ) : (
                hasGplae && <span>)</span>
              )}
            </div>
          )}
        </div>
      ),
    };

    data.push(updateData);
    setInfoAccordionItems(data);

    setAccordionItems(accordionItemsData);
  }, [examinationHistory]);

  return (
    <div className="overflow-y-auto" style={{ padding: "10px 10px 0px" }}>
      {obstetricDetails?.lmp ||
      obstetricDetails?.edd ||
      obstetricDetails?.ceed ||
      obstetricDetails?.gravidity ||
      obstetricDetails?.parity ||
      obstetricDetails?.livingChildren ||
      obstetricDetails?.abortion ||
      obstetricDetails?.ectopicPregnancies ? (
        <PatientInfoList />
      ) : null}

      <Collapse
        defaultActiveKey={[0]}
        className="prescriptiontab-accordian history-sider-box history-sider-box-white"
        expandIconPosition={"end"}
      >
        {accordionItems?.map((item, index) => (
          <React.Fragment key={index}>
            <Collapse.Panel header={item.label} key={item.key}>
              {item.content}
            </Collapse.Panel>
            {index <= accordionItems.length - 1 && (
              <Divider
                dashed
                style={{
                  borderTop: "1px dotted #D0D5DD",
                  margin: "6px 0",
                  width: "100%",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </Collapse>

      {shouldShowAncHistory || shouldShowImmunisation ? (
        <Collapse
          items={[
            {
              key: "anc",
              label: (
                <span style={{ fontWeight: 600 }}>
                  ANC Scheduler & Immunisation Vaccine
                </span>
              ),
              children: (
                <AncImmunisationList
                  handleDrawerObstetric={handleDrawerObstetric}
                />
              ),
            },
          ]}
          defaultActiveKey={["anc"]}
          className="prescriptiontab-accordian history-sider-box history-sider-box-white"
          expandIconPosition={"end"}
        />
      ) : null}
    </div>
  );
};

export default ObstetricList;
