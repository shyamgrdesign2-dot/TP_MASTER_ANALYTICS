import React, { useEffect, useState } from "react";
import { isPrimigravida } from "../../utils/helper";
import moment from "moment";
import ReadMore from "../../../../common/ReadMore";
import { useSelector } from "react-redux";
import { Divider } from "antd";

const PatientInfoList = () => {
  const { obstetricDetails: allObstetricDetails } = useSelector(
    (state) => state.obstetric
  );
  const obstetricDetails = allObstetricDetails?.currentPregnancy || {};
  const { examinationHistory } = obstetricDetails || [];
  const [infoAccordionItems, setInfoAccordionItems] = useState([]);

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
              obstetricDetails?.ceed) && (
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
                  (obstetricDetails.edd ||
                    obstetricDetails.ceed ||
                    gestationDays > 0 ||
                    gestationWeeks > 0) &&
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
  }, [examinationHistory]);
  return (
    <div>
      {infoAccordionItems?.map((item, index) => (
        <React.Fragment key={index}>
          {item.content}
          {index < infoAccordionItems?.length - 1 && (
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
    </div>
  );
};

export default React.memo(PatientInfoList);
