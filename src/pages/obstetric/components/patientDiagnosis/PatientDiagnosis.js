import React, { useEffect, useState } from "react";
import "./PatientDiagnosis.scss";
import {
  Col,
  Collapse,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  Row,
} from "antd";
import DiagnosisNotes from "../diagnosisNotes/DiagnosisNotes";
import { Dropdown, DropdownButton } from "react-bootstrap";
import ReadMore from "../../../../common/ReadMore";
import {
  BloodGroupOptions,
  ConsangOptions,
  MaritalStatusOptions,
} from "../../utils/constants";
import dayjs from "dayjs";
import moment from "moment";
import {
  obstetricDetailsUpdated,
  patientDiagnosisUpdated,
} from "../../../../redux/obstetricSlice";
import { useDispatch } from "react-redux";
import { isPrimigravida } from "../../utils/helper";

export default function PatientDiagnosis({
  lmpDate,
  patientDiagnosisData,
  pastPregnancyData,
  patientDiagnosisNotes,
  setLmpDate,
  setPatientDiagnosisData,
  setPastPregnancyData,
  setPatientDiagnosisNotes,
  isFixed,
  setPrefillObstetricData,
  isPreviousPregnancyOverview,
}) {
  const dispatch = useDispatch();
  const [diagnosisNotesDrawer, setDiagnosisNotesDrawer] = useState(false);
  const isMobile = window.innerWidth < 1200;

  useEffect(() => {
    if (lmpDate) {
      const today = moment();
      const lmp = moment(lmpDate);
      let gestationInWeeks;
      let gestationInDays;
      if (patientDiagnosisData.ceed) {
        const gestationAge =
          40 * 7 -
          Math.ceil(
            Math.abs(
              dayjs(patientDiagnosisData.ceed)
                .startOf("day")
                .diff(dayjs(today).startOf("day"), "day")
            )
          );

        // Convert to weeks and days
        gestationInWeeks = Math.floor(gestationAge / 7);
        gestationInDays = gestationAge % 7;
      } else {
        gestationInWeeks = today.diff(lmp, "weeks");
        const tempDate = lmp.clone().add(gestationInWeeks, "weeks");
        gestationInDays = today.diff(tempDate, "days");
      }
      /**
       * EDD Formula: LMP date + 1 year - 3 months + 7 days
       */
      setPatientDiagnosisData((prevState) => ({
        ...prevState,
        lmp: lmpDate,
        edd: moment(lmpDate)
          .clone()
          .add(1, "year")
          .subtract(3, "months")
          .add(7, "days")
          .toDate()
          .toISOString(),
        gestationWeeks: gestationInWeeks,
        gestationDays: gestationInDays,
      }));
      dispatch(patientDiagnosisUpdated());
      dispatch(obstetricDetailsUpdated());
    }
  }, [lmpDate]);

  const handlePatientDiagnosis = (newValue, key, isValid = true) => {
    const today = moment();
    let gestationInWeeks;
    let gestationInDays;
    if (isValid && !isPreviousPregnancyOverview) {
      if (["lmp", "blood", "maritialStatus"].includes(key)) {
        setPrefillObstetricData((prevState) => ({
          ...prevState,
          [key === "blood"
            ? "bloodGroup"
            : key === "maritialStatus"
            ? "marriedStatus"
            : key]: newValue,
        }));
      }
      setPatientDiagnosisData((prevState) => ({
        ...prevState,
        [key]: newValue,
      }));
      if (key === "lmp" && newValue === null) {
        if (patientDiagnosisData.ceed) {
          const gestationAge =
            40 * 7 -
            Math.ceil(
              Math.abs(
                dayjs(patientDiagnosisData.ceed)
                  .startOf("day")
                  .diff(dayjs(today).startOf("day"), "day")
              )
            );

          // Convert to weeks and days
          gestationInWeeks = Math.floor(gestationAge / 7);
          gestationInDays = gestationAge % 7;
        }
        setPatientDiagnosisData((prevState) => ({
          ...prevState,
          edd: undefined,
          gestationWeeks: gestationInWeeks,
          gestationDays: gestationInDays,
        }));
      }
      if (key === "ceed" && !newValue && !patientDiagnosisData.lmp) {
        setPatientDiagnosisData((prevState) => ({
          ...prevState,
          gestationWeeks: undefined,
          gestationDays: undefined,
        }));
      } else if (key === "ceed") {
        const lmp = moment(patientDiagnosisData.lmp);

        if (newValue) {
          const gestationAge =
            40 * 7 -
            Math.ceil(
              Math.abs(
                dayjs(newValue)
                  .startOf("day")
                  .diff(dayjs(today).startOf("day"), "day")
              )
            );

          // Convert to weeks and days
          gestationInWeeks = Math.floor(gestationAge / 7);
          gestationInDays = gestationAge % 7;
        } else {
          gestationInWeeks = today.diff(lmp, "weeks");
          const tempDate = lmp.clone().add(gestationInWeeks, "weeks");
          gestationInDays = today.diff(tempDate, "days");
        }
        setPatientDiagnosisData((prevState) => ({
          ...prevState,
          gestationWeeks: gestationInWeeks,
          gestationDays: gestationInDays,
        }));
      }

      dispatch(patientDiagnosisUpdated());
      dispatch(obstetricDetailsUpdated());
    }
  };

  const handleDrawerDiagnosisNotes = () => {
    setDiagnosisNotesDrawer(!diagnosisNotesDrawer);
  };

  const handleInputChange = (index, newValue, isValid) => {
    if (isValid) {
      const updatedData = [...pastPregnancyData];
      updatedData[index].value = newValue !== "" ? newValue : undefined;
      setPastPregnancyData(updatedData);
      dispatch(patientDiagnosisUpdated());
      dispatch(obstetricDetailsUpdated());
    }
  };

  const patientDiagnosisAccordian = {
    label: (
      <div
        className="fw-semibold"
        style={{
          background: "transparent",
        }}
      >
        Patient Information
      </div>
    ),
    content: (
      <div className="diagnosisItems">
        <div className="rowContainer">
          <div className="history-badge" style={{ width: "167px" }}>
            LMP :
            <DatePicker
              className="datePickerStyle"
              placeholder="Select Date"
              dropdownClassName="addDOB-picker-dropdown lmpStyle"
              format={{
                format: "DD-MM-YYYY",
                type: "mask",
              }}
              value={
                patientDiagnosisData.lmp
                  ? dayjs(patientDiagnosisData.lmp)
                  : null
              }
              onChange={(_, dateString) => {
                if (dateString) {
                  handlePatientDiagnosis(
                    dayjs(dateString, "DD-MM-YYYY").toISOString(),
                    "lmp"
                  );
                  setLmpDate(dayjs(dateString, "DD-MM-YYYY").toISOString());
                } else {
                  handlePatientDiagnosis(null, "lmp");
                }
              }}
              disabled={isPreviousPregnancyOverview}
              style={{
                height: "34px",
                width: "75%",
                border: "none",
                borderTopRightRadius: "10px",
                borderBottomRightRadius: "10px",
                padding: "0 4px 0 4px",
              }}
              disabledDate={(current) => current && current > dayjs()}
            />
          </div>
          <div
            className="history-badge"
            style={{ cursor: "disabled", backgroundColor: "#FAFAFB" }}
          >
            E.D.D :{" "}
            <span className="spanStyle" style={{ marginLeft: "8px" }}>
              {patientDiagnosisData.edd
                ? moment(patientDiagnosisData.edd).format("DD-MM-YYYY")
                : ""}
            </span>
          </div>
          <div className="history-badge" style={{ width: "188px" }}>
            C.E.D.D :
            <DatePicker
              placeholder="Select Date"
              className="datePickerStyle"
              dropdownClassName="addDOB-picker-dropdown ceddStyle"
              format={{
                format: "DD-MM-YYYY",
                type: "mask",
              }}
              value={
                patientDiagnosisData.ceed
                  ? dayjs(patientDiagnosisData.ceed)
                  : null
              }
              onChange={(_, dateString) => {
                if (dateString) {
                  handlePatientDiagnosis(
                    dayjs(dateString, "DD-MM-YYYY").toISOString(),
                    "ceed"
                  );
                } else {
                  handlePatientDiagnosis(undefined, "ceed");
                }
              }}
              disabled={isPreviousPregnancyOverview}
              style={{
                height: "34px",
                width: "68%",
                border: "none",
                borderTopRightRadius: "10px",
                borderBottomRightRadius: "10px",
                padding: "0 6px 0 6px",
              }}
              disabledDate={(current) =>
                current &&
                (current < dayjs().startOf("day") ||
                  current > dayjs().add(280, "day").endOf("day"))
              }
            />
          </div>
          <div className="history-badge">
            Gestation :
            <Input
              className={`timeIntervalValue ${
                isMobile && isPreviousPregnancyOverview
                  ? "timeIntervalValueForPreviousPregnancy"
                  : ""
              }`}
              style={{ marginLeft: "10px" }}
              placeholder="Ex : 3"
              value={patientDiagnosisData.gestationWeeks ?? ""}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, "");
              }}
              onChange={(e) =>
                handlePatientDiagnosis(
                  e.target.value || null,
                  "gestationWeeks",
                  e.target.validity.valid && e.target.value <= 50
                )
              }
              disabled={true}
            />
            <span
              className="timeInterval spanStyle"
              style={{ paddingRight: "5px" }}
            >
              Weeks
            </span>
            <Input
              className={`timeIntervalValue ${
                isMobile && isPreviousPregnancyOverview
                  ? "timeIntervalValueForPreviousPregnancy"
                  : ""
              }`}
              placeholder="Ex : 2"
              value={patientDiagnosisData.gestationDays ?? ""}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/[^0-6]/g, "");
              }}
              onChange={(e) =>
                handlePatientDiagnosis(
                  e.target.value || null,
                  "gestationDays",
                  e.target.validity.valid && e.target.value <= 6
                )
              }
              disabled={true}
            />
            <span
              className="timeInterval spanStyle"
              style={{
                borderTopRightRadius: "10px",
                borderBottomRightRadius: "10px",
              }}
            >
              Days
            </span>
          </div>
          <div
            className={`history-badge patientBloodStyleContainer ${
              isMobile && isPreviousPregnancyOverview
                ? "bloodContainerForPreviousPregnancy"
                : ""
            }`}
          >
            {isMobile ? "Blood :" : "Patient Blood Group :"}
            <DropdownButton
              className="diagnosisSelect bloodGroup"
              title={
                <div className="bloodGroupText">
                  {patientDiagnosisData.blood || "Select"}
                  <i className="icon-right iconStyle" />
                </div>
              }
              onSelect={(e) => handlePatientDiagnosis(e, "blood")}
              disabled={isPreviousPregnancyOverview}
            >
              {BloodGroupOptions.map((option) => (
                <Dropdown.Item
                  key={option.value}
                  eventKey={option.value}
                  className="dropdown-item-custom"
                >
                  {option.label}
                </Dropdown.Item>
              ))}
            </DropdownButton>
          </div>
        </div>

        <div className="rowContainer">
          <div
            className={`history-badge husbandBloodStyleContainer ${
              isMobile && isPreviousPregnancyOverview
                ? "husbandBloodForPreviousPregnancy"
                : ""
            }`}
          >
            {isMobile && isPreviousPregnancyOverview
              ? "Husband's :"
              : isMobile
              ? "Husband's blood :"
              : "Husband's Blood Group :"}
            <DropdownButton
              className="diagnosisSelect husbandBlood"
              title={
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                  }}
                >
                  {patientDiagnosisData.husbandsBlood || "Select"}
                  <i className="icon-right iconStyle" />
                </div>
              }
              onSelect={(e) => handlePatientDiagnosis(e, "husbandsBlood")}
              disabled={isPreviousPregnancyOverview}
            >
              {BloodGroupOptions.map((option) => (
                <Dropdown.Item
                  key={option.value}
                  eventKey={option.value}
                  className="dropdown-item-custom"
                >
                  {option.label}
                </Dropdown.Item>
              ))}
            </DropdownButton>
          </div>
          <div
            className="history-badge"
            style={{ width: "214px", position: "relative" }}
          >
            Marital status :
            <DropdownButton
              className="diagnosisSelect marritalStatus"
              style={{ width: "40%" }}
              title={
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                  }}
                >
                  {patientDiagnosisData.maritialStatus || "Select"}
                  <i className="icon-right iconStyle" />
                </div>
              }
              onSelect={(e) => handlePatientDiagnosis(e, "maritialStatus")}
              disabled={isPreviousPregnancyOverview}
            >
              {MaritalStatusOptions.map((option) => (
                <Dropdown.Item
                  key={option.value}
                  eventKey={option.value}
                  className="dropdown-item-custom"
                >
                  {option.label}
                </Dropdown.Item>
              ))}
            </DropdownButton>
          </div>
          <div className="history-badge">
            Marriage duration :{" "}
            <Input
              className={`timeIntervalValue ${
                isMobile && isPreviousPregnancyOverview
                  ? "timeIntervalValueForPreviousPregnancy"
                  : ""
              }`}
              style={{ marginLeft: "10px" }}
              placeholder="Ex : 3"
              value={patientDiagnosisData.marriageDurationYears}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, "");
              }}
              onChange={(e) =>
                handlePatientDiagnosis(
                  e.target.value || null,
                  "marriageDurationYears",
                  e.target.validity.valid && e.target.value <= 100
                )
              }
              disabled={isPreviousPregnancyOverview}
            />
            <span className="timeInterval spanStyle">Years</span>
            <Input
              className={`timeIntervalValue ${
                isMobile && isPreviousPregnancyOverview
                  ? "timeIntervalValueForPreviousPregnancy"
                  : ""
              }`}
              placeholder="Ex : 2"
              value={patientDiagnosisData.marriageDurationMonths}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, "");
              }}
              onChange={(e) =>
                handlePatientDiagnosis(
                  e.target.value || null,
                  "marriageDurationMonths",
                  e.target.validity.valid && e.target.value <= 11
                )
              }
              disabled={isPreviousPregnancyOverview}
            />
            <span
              className="timeInterval spanStyle"
              style={{
                borderTopRightRadius: "10px",
                borderBottomRightRadius: "10px",
              }}
            >
              Months
            </span>
          </div>
          <div className="history-badge consangStyleContainer">
            {isMobile ? "Consang :" : "Consanguineous : "}
            <DropdownButton
              className="diagnosisSelect consang"
              title={
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                    width: "70px",
                  }}
                >
                  {typeof patientDiagnosisData.consang === "boolean"
                    ? patientDiagnosisData.consang
                      ? "Yes"
                      : "No"
                    : "Select"}
                  <i className="icon-right iconStyle" />
                </div>
              }
              onSelect={(e) =>
                handlePatientDiagnosis(e === "yes" ? true : false, "consang")
              }
              disabled={isPreviousPregnancyOverview}
            >
              {ConsangOptions.map((option) => (
                <Dropdown.Item
                  key={option.value}
                  eventKey={option.value}
                  className="dropdown-item-custom"
                >
                  {option.label}
                </Dropdown.Item>
              ))}
            </DropdownButton>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div>
      <div
        className="patientDiagnosisContainer"
        style={{ marginTop: isFixed ? "75px" : "0px" }}
      >
        <Collapse
          defaultActiveKey={["0"]}
          className="prescriptiontab-accordian  patientDiagnosisAccordian"
          expandIconPosition={"end"}
        >
          <Collapse.Panel header={patientDiagnosisAccordian.label}>
            {patientDiagnosisAccordian.content}
          </Collapse.Panel>
        </Collapse>
      </div>
      <div
        className={`pastPregnancyContainer ${
          isFixed ? "fixPastPregnancy" : ""
        }`}
        style={{ left: isFixed && isPreviousPregnancyOverview ? "10%" : "" }}
      >
        <Row gutter={30}>
          {pastPregnancyData.map((item, index) => {
            return (
              <Col key={index}>
                <Form.Item label={item.label} className="pastPregnancyItem">
                  <Input
                    value={item.value}
                    onChange={(e) =>
                      handleInputChange(
                        index,
                        e.target.value,
                        e.target.validity.valid && e.target.value <= 45
                      )
                    }
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, "");
                    }}
                    style={{ width: "40px", height: "28px" }}
                    disabled={isPreviousPregnancyOverview}
                  />
                </Form.Item>
              </Col>
            );
          })}
          {isPrimigravida(pastPregnancyData) && (
            <div className="primigravida">Primigravida</div>
          )}
        </Row>
        {patientDiagnosisNotes ? (
          <div className="diagnosisNotesStyle">
            <ReadMore text={patientDiagnosisNotes} textLimit={125} />
            {!isPreviousPregnancyOverview && (
              <div
                className="editStyle"
                onClick={handleDrawerDiagnosisNotes}
                disabled={isPreviousPregnancyOverview}
              >
                <i className="icon-Edit iconStyle" />

                <span className="editText">Edit</span>
              </div>
            )}
          </div>
        ) : !isPreviousPregnancyOverview ? (
          <button
            className="btn d-flex align-items-center btn-text"
            style={{
              color: "#4B4AD5",
              fontSize: "14px",
              fontWeight: "500",
              paddingRight: "40px",
            }}
            onClick={handleDrawerDiagnosisNotes}
          >
            <i className={`icon-Add me-1 fs-5`} /> Add diagnosis notes
          </button>
        ) : null}
      </div>
      <Divider
        dashed
        style={{
          borderTop: "1px solid #EAECF0",
          margin: "0px",
          width: "100%",
        }}
      />
      {diagnosisNotesDrawer && (
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleDrawerDiagnosisNotes}
          open={diagnosisNotesDrawer}
          className="modalWidth-563"
          width="auto"
        >
          <DiagnosisNotes
            handleDrawerDiagnosisNotes={handleDrawerDiagnosisNotes}
            diagnosisNotes={patientDiagnosisNotes}
            setDiagnosisNotes={setPatientDiagnosisNotes}
          />
        </Drawer>
      )}
    </div>
  );
}
