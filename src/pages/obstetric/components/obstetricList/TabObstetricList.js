import React, { useState, useEffect } from "react";
import { Button, Collapse, Divider } from "antd";
import ReadMore from "../../../../common/ReadMore";
import "./ObstetricList.scss";
import { useSelector } from "react-redux";
import { obstetricTabListColumns } from "../../utils/constants";
import { isPrimigravida } from "../../utils/helper";
import moment from "moment";
import AncImmunisationList from "./AncImmunisationList";
import TabSiderEmptyState from "../../../../components/tab_design/TabSiderEmptyState";

const TabObstetricList = ({ handleCollapsed, handleDrawerObstetric, isTabRx }) => {
  const { obstetricDetails: allObstetricDetails } = useSelector(
    (state) => state.obstetric
  );
  const obstetricDetails = allObstetricDetails?.currentPregnancy || {};
  const { examinationHistory = [] } = obstetricDetails || [];
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
  const hasObstetricData =
    infoAccordionItems?.length > 0 ||
    accordionItems?.length > 0 ||
    shouldShowAncHistory ||
    shouldShowImmunisation;

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

  const measurementDetails = (obsVisit) => {
    return (
      <div style={{ display: "flex", flexDirection: "column", rowGap: "16px" }}>
        {obstetricTabListColumns.map((visitItem, index) => {
          let value =
            typeof obsVisit[visitItem.key] === "boolean"
              ? obsVisit[visitItem.key]
                ? "Yes"
                : "No"
              : obsVisit[visitItem.key];
          if (value) {
            value +=
              visitItem.key === "heightOfFundus"
                ? " " + obsVisit.heightOfFundusUnit ?? ""
                : visitItem.siUnit;
            return (
              <React.Fragment key={index}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                    justifyContent: "space-between",
                    position: "relative",
                    flexDirection: visitItem.key === "notes" ? "column" : "",
                  }}
                >
                  <span className="key">{visitItem.title}</span>
                  <span style={{ position: "absolute", left: "49%" }}>
                    {visitItem.key !== "notes" ? ":" : ""}
                  </span>

                  {visitItem.key === "notes" ? (
                    <div
                      className="cardbody-data mt-2 border visitItem"
                      style={{
                        borderRadius: "8px",
                        padding: "5px 15px",
                      }}
                    >
                      <ReadMore text={value} textLimit={60} textSize={12} />
                    </div>
                  ) : (
                    <span style={{ fontWeight: "400" }}>{value}</span>
                  )}
                </div>
              </React.Fragment>
            );
          }
        })}
      </div>
    );
  };

  useEffect(() => {
    const accordionItemsData = examinationHistory?.map((obsVisit, i) => ({
      key: i,
      label: (
        <div className="fw-semibold obstetricAccordianTitle">
          {`Visit ${examinationHistory.length - i}`}
        </div>
      ),
      content: (
        <div
          className="cardbody-data mt-3"
          style={{
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            background: "#FAFAFB",
            paddingBottom: "0px",
          }}
        >
          {measurementDetails(obsVisit)}
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
                  (obstetricDetails.edd || obstetricDetails?.ceed) &&
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

    if (
      hasPatientInfo ||
      obstetricDetails.lmp ||
      obstetricDetails.edd ||
      obstetricDetails.ceed
    ) {
      data.push(updateData);
    }
    setInfoAccordionItems(data);

    setAccordionItems(accordionItemsData);
  }, []);

  useEffect(() => {
    if (examinationHistory?.length === 0) {
      setAccordionItems([]);
    }
  }, [examinationHistory]);

  return (
    <>
      <div className={`text-white align-items-center bg-secondary d-flex justify-content-between lh-lg px-2 py-2 ${isTabRx ? 'tab-rx-header' : ''}`}>
        Obstetric History
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
          {hasObstetricData ? (
            <>
            <Button
              className="btn btn-input d-flex w-100 align-items-center btn-41"
              onClick={handleDrawerObstetric}
            >
              <i className="icon-Add me-2 fs-21"></i>
              Add or Edit History
            </Button>
          {(infoAccordionItems?.length > 0 || accordionItems?.length > 0) && (
            <div
              className="border rounded-3 bg-body mt-3"
              style={{ padding: "16px" }}
            >
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
              <Collapse
                defaultActiveKey={[0]}
                className="prescriptiontab-accordian history-sider-box history-sider-box-white obstetricAccordian"
                expandIconPosition={"end"}
              >
                {accordionItems?.map((item, index) => (
                  <React.Fragment key={item.key}>
                    <Collapse.Panel header={item.label} key={item.key}>
                      {item.content}
                    </Collapse.Panel>
                    {index < accordionItems.length - 1 && (
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
            </div>
          )}
          {(shouldShowAncHistory || shouldShowImmunisation) && (
            <div
              className="border rounded-3 bg-body mt-3"
              style={{ padding: "16px" }}
            >
              <Collapse
                items={[
                  {
                    key: "anc",
                    label: (
                      <span style={{ fontWeight: 600 }}>
                        ANC Scheduler & Immunisation Vaccines
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
                className="prescriptiontab-accordian history-sider-box obstetric-collapse"
                expandIconPosition={"end"}
              />
            </div>
          )}
            </>
          ) : (
            <TabSiderEmptyState
              title="No Obstetric History!"
              description="It looks like there is no obstetric history added for this patient yet."
              actionLabel="Add Obstetric History"
              onAction={handleDrawerObstetric}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default TabObstetricList;
