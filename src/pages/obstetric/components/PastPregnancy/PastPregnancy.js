import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Button,
  Card,
  DatePicker,
  Input,
  Tooltip,
  Select,
  Radio,
  message,
} from "antd";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import "./pastPregnancy.scss";
import { EllipsisOutlined, DeleteOutlined } from "@ant-design/icons";
import { MESSAGE_KEY } from "../../../../utils/constants";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import {
  addObstetricDetails,
  obstetricDetailsUpdated,
  patientDiagnosisUpdated,
  resetUpdatedPatientDiagnosis,
} from "../../../../redux/obstetricSlice";

import { isDecimalCheck, isNumberCheck } from "../../utils/helper";
import CommonModal from "../../../../common/CommonModal";
import { upsertObstetricDetails } from "../../service";
import { errorMessage, getClinicName } from "../../../../utils/utils";
import { getOrdinalSuffix } from "../../../growthChart/growthChartHelper";
import { ASSETS } from "../../../../assets";
const {
  alerticon: alertIcon,
  closeVisit: imgCloseVisit,
  checkBadge: visitEnd,
} = ASSETS.images;

function PastPregnancy({
  close,
  editIndex,
  toggleDeletePopup,
  isDataAddedOrEdited,
  setIsDataAddedOrEdited,
  setIsPastPregnancyUpdated,
  isCompletePregnancy,
  isPregnancyCompleted,
  gravidity,
  setLoader,
  resetDataAfterPregnancyCompleted,
}) {
  const dispatch = useDispatch();
  const scrollContainerRef = useRef(null);
  const [pastPregnancyData, setPastPregnancyData] = useState({});
  const [shouldShowConfirmPopup, setShowConfirmPopup] = useState(false);
  const [doneLoader, setDoneLoader] = useState(false);
  const { profile, userId } = useSelector((state) => state.doctors);
  const { obstetricDetails: allObstetricDetails } = useSelector(
    (state) => state.obstetric
  );
  const obstetricDetails = allObstetricDetails?.currentPregnancy || {};
  const { pregnancyHistory = [] } = allObstetricDetails;
  const { state } = useLocation();
  const { patient_data } = state;

  useEffect(() => {
    if (editIndex >= 0) {
      const data = pregnancyHistory[editIndex] || {};
      const age = data?.ageOfDelivery
        ? {
            ageOfDeliveryYears:
              data?.ageOfDelivery?.indexOf("y") > -1
                ? data?.ageOfDelivery?.slice(
                    0,
                    data?.ageOfDelivery?.indexOf("y")
                  )
                : "",
            ageOfDeliveryMonths:
              data?.ageOfDelivery?.indexOf("m") > -1
                ? data?.ageOfDelivery?.slice(
                    data?.ageOfDelivery?.indexOf(" ") + 1,
                    data?.ageOfDelivery?.indexOf("m")
                  )
                : "",
          }
        : {};
      setPastPregnancyData({ ...data, ...age });
    }
  }, [editIndex]);

  useEffect(() => {
    if (isCompletePregnancy) {
      handlePastPregnancyDataChange("gravidity", gravidity);
    }
  }, []);

  const handlePastPregnancyDataChange = (field, value) => {
    let temp = {};
    if (
      field === "dateOfDelivery" &&
      pastPregnancyData?.typeOfDelivery === "date" &&
      pastPregnancyData?.ageOfDelivery
    ) {
      temp = {
        [field]: value,
        ageOfDelivery: "",
        ageOfDeliveryYears: "",
        ageOfDeliveryMonths: "",
      };
    }
    setPastPregnancyData((prevData) => {
      const newData = {
        ...prevData,
        [field]:
          field !== "remarks" &&
          field !== "dateOfDelivery" &&
          value === prevData[field]
            ? undefined
            : value,
        ...temp,
        modifiedAt: new Date().toISOString(),
      };
      return newData;
    });
    setIsDataAddedOrEdited(true);
  };

  const handleAgeOfDeliveryChange = (field, value) => {
    setPastPregnancyData((prevData) => {
      const updatedData = {
        ...prevData,
        [field]: value,
      };
      let temp = {};
      if (
        pastPregnancyData?.typeOfDelivery === "age" &&
        pastPregnancyData?.dateOfDelivery
      ) {
        temp = { [field]: value, dateOfDelivery: "" };
      }
      const ageOfDeliveryYears = updatedData.ageOfDeliveryYears || "";
      const ageOfDeliveryMonths = updatedData.ageOfDeliveryMonths || "";

      const ageOfDelivery = `${
        ageOfDeliveryYears ? ageOfDeliveryYears + "y " : ""
      }${ageOfDeliveryMonths ? ageOfDeliveryMonths + "m" : ""}`?.trim();

      return {
        ...updatedData,
        ageOfDelivery,
        ...temp,
      };
    });
    setIsDataAddedOrEdited(true);
  };

  const disabledDate = (current) => {
    return current && current >= moment().add(1, "days").startOf("day");
  };

  const addPastPregnancyData = async () => {
    setIsPastPregnancyUpdated(true);
    let newPastPregnancy = [...pregnancyHistory] || [];
    const data = {};
    Object.keys(pastPregnancyData).forEach((key) => {
      if (![undefined, null, ""].includes(pastPregnancyData[key])) {
        data[key] =
          key === "remarks"
            ? pastPregnancyData[key]?.trim()
            : pastPregnancyData[key];
      }
    });
    if (pregnancyHistory?.length > 0 && editIndex >= 0) {
      newPastPregnancy[editIndex] = {
        ...data,
        dateOfDelivery: data?.dateOfDelivery
          ? new Date(data?.dateOfDelivery).toISOString()
          : undefined,
        modifiedAt: new Date().toISOString(),
        modifiedBy: userId,
      };
    } else {
      newPastPregnancy = [
        ...pregnancyHistory,
        {
          ...data,
          dateOfDelivery: data?.dateOfDelivery
            ? new Date(data?.dateOfDelivery).toISOString()
            : undefined,
          examinationHistory: [],
          ancHistory: [],
          immunisationHistory: [],
          createdAt: new Date().toISOString(),
          createdBy: userId,
          modifiedAt: new Date().toISOString(),
          modifiedBy: userId,
          ...obstetricDetails,
        },
      ];
    }
    let payload = {
      ...allObstetricDetails,
      pregnancyHistory: newPastPregnancy,
    };

    if (isCompletePregnancy) {
      payload = {
        ...payload,
        currentPregnancy: null,
      };
      setLoader(true);
      const obstetricResponse = await upsertObstetricDetails(
        patient_data.patient_unique_id,
        payload
      );
      setLoader(false);
      if (obstetricResponse) {
        message.open({
          key: MESSAGE_KEY,
          type: "",
          className: "message-appointment",
          content: (
            <div className="d-flex align-items-center">
              <img src={visitEnd} className="me-3" />
              <div>
                <div className="fontroboto text-start fw-normal mt-1">
                  {patient_data?.pm_fullname}’s{" "}
                  {pastPregnancyData?.gravidity
                    ? `${getOrdinalSuffix(pastPregnancyData?.gravidity)} `
                    : ""}
                  Pregnancy closed successfully
                </div>
              </div>
              <img
                src={imgCloseVisit}
                className="ms-3"
                onClick={() => message.destroy()}
              />
            </div>
          ),
          duration: 5,
        });
        resetDataAfterPregnancyCompleted();
      } else {
        errorMessage("Error while Completing Pregnancy!");
      }
    }
    dispatch(addObstetricDetails(payload));
    dispatch(obstetricDetailsUpdated());
    dispatch(patientDiagnosisUpdated());
    setIsDataAddedOrEdited(false);
    close();
  };

  const deletePastPregnancyData = async () => {
    let newPastPregnancy = [...pregnancyHistory];
    if (editIndex >= 0) {
      newPastPregnancy.splice(editIndex, 1);
    }
    const payload = {
      ...allObstetricDetails,
      pregnancyHistory: newPastPregnancy,
    };
    dispatch(addObstetricDetails(payload));
    dispatch(obstetricDetailsUpdated());
    dispatch(patientDiagnosisUpdated());
    setIsDataAddedOrEdited(false);
    close();
  };

  const obstetricDeleteBtnHandler = async () => {
    let newPastPregnancy = [...pregnancyHistory];
    if (editIndex >= 0) {
      newPastPregnancy.splice(editIndex, 1);
    }
    const payload = {
      ...allObstetricDetails,
      pregnancyHistory: newPastPregnancy,
    };

    dispatch(addObstetricDetails(payload));
    dispatch(resetUpdatedPatientDiagnosis());
    setDoneLoader(true);
    const obstetricResponse = await upsertObstetricDetails(
      patient_data.patient_unique_id,
      payload
    );
    setDoneLoader(false);
    if (obstetricResponse) {
      message.open({
        key: MESSAGE_KEY,
        type: "",
        className: "message-appointment",
        content: (
          <div className="d-flex align-items-center">
            <img src={visitEnd} className="me-3" />
            <div>
              <div className="fontroboto text-start fw-normal mt-1">
                Past Pregnancy Details deleted successfully
              </div>
            </div>
            <img
              src={imgCloseVisit}
              className="ms-3"
              onClick={() => message.destroy()}
            />
          </div>
        ),
        duration: 5,
      });
    } else {
      errorMessage("Error while adding data");
    }
    close();
  };

  const TABLE_PAST_PREGNANCY = useMemo(() => {
    return (
      <div className="past-pregnancy-wrap-body past-pregnancy-child-width">
        <div className="past-pregnancy-head rounded-start-0 w-100">
          Values
          {editIndex >= 0 && (
            <div>
              <Tooltip
                trigger={"click"}
                placement="bottom"
                title={
                  <div
                    className="tooltip-content"
                    onClick={
                      isPregnancyCompleted
                        ? obstetricDeleteBtnHandler
                        : deletePastPregnancyData
                    }
                  >
                    <DeleteOutlined className="delete-icon" />
                    <span>Delete</span>
                  </div>
                }
                overlayClassName="custom-tooltip"
              >
                <EllipsisOutlined className="vertical-dots" />
              </Tooltip>
            </div>
          )}
        </div>
        <div className="past-pregnancy-row past-pregnancy-row-40 d-flex align-items-center px-2 py-5 w-100">
          <Select
            style={{ width: 170, height: 40, outline: "none" }}
            onChange={(value) =>
              handlePastPregnancyDataChange("gravidity", value)
            }
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
              { value: "4", label: "4" },
              { value: "5", label: "5" },
              { value: "6", label: "6" },
              { value: "7", label: "7" },
              { value: "8", label: "8" },
              { value: "9", label: "9" },
            ]}
            placeholder="Select"
            className="custom-select"
            value={
              pastPregnancyData?.gravidity || pastPregnancyData?.gravidaNumber
            }
            allowClear
            disabled={isCompletePregnancy && gravidity}
          />
        </div>
        <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5 w-100">
          <Select
            style={{ width: 170, height: 40 }}
            onChange={(value) =>
              handlePastPregnancyDataChange("outcome", value)
            }
            options={[
              { value: "Live", label: "Live" },
              { value: "Still birth", label: "Still birth" },
              { value: "Ectopic", label: "Ectopic" },
              { value: "Abortion", label: "Miscarriage" },
            ]}
            placeholder="Select"
            className="custom-select"
            value={pastPregnancyData?.outcome}
            allowClear
          />
        </div>

        {["Live", "Still birth"].includes(pastPregnancyData?.outcome) && (
          <>
            <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5 w-100">
              <Radio.Group value={pastPregnancyData.termLength}>
                <Radio.Button
                  value={"Term"}
                  onClick={() =>
                    handlePastPregnancyDataChange("termLength", "Term")
                  }
                  style={{
                    height: "41px",
                    padding: "5px 20px 0 20px",
                  }}
                  className="custom-radio-button"
                >
                  Term
                </Radio.Button>
                <Radio.Button
                  value={"Preterm"}
                  onClick={() =>
                    handlePastPregnancyDataChange("termLength", "Preterm")
                  }
                  style={{
                    height: "41px",
                    padding: "5px 20px 0 20px",
                  }}
                  className="custom-radio-button"
                >
                  Pre term
                </Radio.Button>
              </Radio.Group>
            </div>
            <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5 w-100">
              <Select
                style={{ width: 170, height: 40 }}
                onChange={(value) =>
                  handlePastPregnancyDataChange("deliveryMode", value)
                }
                options={[
                  { value: "FTND", label: "FTND" },
                  { value: "LSCS", label: "LSCS" },
                  { value: "PTVD", label: "PTVD" },
                ]}
                placeholder="Select"
                className="custom-select"
                value={pastPregnancyData.deliveryMode}
                allowClear
              />
            </div>
            <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5 w-100">
              <Radio.Group value={pastPregnancyData.typeOfDelivery}>
                <Radio.Button
                  value={"date"}
                  onClick={() =>
                    handlePastPregnancyDataChange("typeOfDelivery", "date")
                  }
                  style={{
                    width: "85px",
                    height: "41px",
                    padding: "5px 20px 0 25px",
                  }}
                  className="custom-radio-button"
                >
                  DOD
                </Radio.Button>
                <Radio.Button
                  value={"age"}
                  onClick={() =>
                    handlePastPregnancyDataChange("typeOfDelivery", "age")
                  }
                  style={{
                    width: "85px",
                    height: "41px",
                    padding: "5px 20px 0 25px",
                  }}
                  className="custom-radio-button"
                >
                  Age
                </Radio.Button>
              </Radio.Group>
            </div>
            {pastPregnancyData?.typeOfDelivery && (
              <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5 w-100">
                {pastPregnancyData?.typeOfDelivery === "date" && (
                  <DatePicker
                    key={"dateOfDelivery"}
                    onChange={(date) => {
                      if (date) {
                        const formattedDate = date.format("YYYY-MM-DD");
                        handlePastPregnancyDataChange(
                          "dateOfDelivery",
                          formattedDate
                        );
                      } else {
                        handlePastPregnancyDataChange(
                          "dateOfDelivery",
                          undefined
                        );
                      }
                    }}
                    disabledDate={disabledDate}
                    style={{ width: "170px", height: "41px" }}
                    value={
                      pastPregnancyData.dateOfDelivery
                        ? dayjs(moment(pastPregnancyData.dateOfDelivery))
                        : ""
                    }
                    format={{
                      format: "DD-MM-YYYY",
                      type: "mask",
                    }}
                    allowClear
                  />
                )}
                {pastPregnancyData?.typeOfDelivery === "age" && (
                  <>
                    <Input
                      className="inputheight41-group"
                      style={{ width: "82px" }}
                      placeholder="Enter"
                      inputMode="numeric"
                      value={pastPregnancyData.ageOfDeliveryYears || ""}
                      addonAfter={"Yr"}
                      onChange={(e) =>
                        isNumberCheck(e) &&
                        e.target.value < 150 &&
                        handleAgeOfDeliveryChange(
                          "ageOfDeliveryYears",
                          e.target.value
                        )
                      }
                    />
                    <Input
                      className="inputheight41-group"
                      style={{ width: "82px", marginLeft: "10px" }}
                      placeholder="Enter"
                      inputMode="numeric"
                      value={pastPregnancyData.ageOfDeliveryMonths || ""}
                      addonAfter={"M"}
                      onChange={(e) =>
                        isNumberCheck(e) &&
                        e.target.value < 12 &&
                        handleAgeOfDeliveryChange(
                          "ageOfDeliveryMonths",
                          e.target.value
                        )
                      }
                    />
                  </>
                )}
              </div>
            )}
            <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5 w-100">
              <Radio.Group value={pastPregnancyData.gender}>
                <Radio.Button
                  value={"Male"}
                  onClick={() =>
                    handlePastPregnancyDataChange("gender", "Male")
                  }
                  style={{
                    width: "85px",
                    height: "41px",
                    padding: "5px 0 0 20px",
                  }}
                  className="custom-radio-button"
                >
                  Male
                </Radio.Button>
                <Radio.Button
                  value={"Female"}
                  onClick={() =>
                    handlePastPregnancyDataChange("gender", "Female")
                  }
                  style={{
                    width: "85px",
                    height: "41px",
                    padding: "5px 0 0 20px",
                  }}
                  className="custom-radio-button"
                >
                  Female
                </Radio.Button>
              </Radio.Group>
            </div>
            <div className="past-pregnancy-row past-pregnancy-row-40 d-flex align-items-center px-2 py-5 w-100">
              <Input
                className="inputheight41-group"
                placeholder="Enter"
                inputMode="numeric"
                value={pastPregnancyData.babysWeight || ""}
                addonAfter={"Kgs"}
                onChange={(e) =>
                  isDecimalCheck(e) &&
                  handlePastPregnancyDataChange("babysWeight", e.target.value)
                }
              />
            </div>
          </>
        )}
        {["Ectopic", "Abortion"].includes(pastPregnancyData.outcome) && (
          <>
            <div className="past-pregnancy-row past-pregnancy-row-40 d-flex align-items-center px-2 py-5 w-100">
              <Input
                className="inputheight41-group"
                placeholder="Enter"
                inputMode="numeric"
                value={pastPregnancyData.gestationPeriod || ""}
                addonAfter={"weeks"}
                onChange={(e) =>
                  isNumberCheck(e) &&
                  handlePastPregnancyDataChange(
                    "gestationPeriod",
                    e.target.value
                  )
                }
              />
            </div>
            {pastPregnancyData.outcome === "Ectopic" && (
              <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5 w-100">
                <Select
                  style={{ width: 170, height: 40 }}
                  onChange={(value) =>
                    handlePastPregnancyDataChange("location", value)
                  }
                  options={[
                    { value: "Left tube", label: "Left tube" },
                    { value: "Right tube", label: "Right tube" },
                    { value: "Others", label: "Others" },
                    { value: "Cornual Pregnancy", label: "Cornual Pregnancy" },
                    {
                      value: "Extra Uterine Pregnancy",
                      label: "Extra Uterine Pregnancy",
                    },
                    { value: "Ovarian Pregnancy", label: "Ovarian Pregnancy" },
                    { value: "Tubal Abortion", label: "Tubal Abortion" },
                  ]}
                  placeholder="Select"
                  className="custom-select"
                  value={pastPregnancyData.location}
                  allowClear
                />
              </div>
            )}
            {pastPregnancyData.outcome === "Abortion" && (
              <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5 w-100">
                <Select
                  style={{ width: 170, height: 40 }}
                  onChange={(value) =>
                    handlePastPregnancyDataChange("typeOfAbortion", value)
                  }
                  options={[
                    { value: "Missed abortion", label: "Missed Miscarriage" },
                    { value: "Spontaneous", label: "Spontaneous" },
                    { value: "Induce", label: "Induce" },
                    { value: "Recurrent", label: "Recurrent" },
                    { value: "Septic Abortion", label: "Septic Abortion" },
                    {
                      value: "Incomplete Abortion",
                      label: "Incomplete Abortion",
                    },
                    { value: "Blighted Ovum", label: "Blighted Ovum" },
                    { value: "Hydatidiform Mole", label: "Hydatidiform Mole" },
                  ]}
                  placeholder="Select"
                  className="custom-select"
                  value={pastPregnancyData.typeOfAbortion}
                  allowClear
                />
              </div>
            )}
            <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5 w-100">
              <Radio.Group
                value={
                  pastPregnancyData.outcome === "Abortion"
                    ? pastPregnancyData.modeOfAbortion
                    : pastPregnancyData.modeOfManagement
                }
              >
                <Radio.Button
                  value={"Medical"}
                  onClick={() =>
                    handlePastPregnancyDataChange(
                      pastPregnancyData.outcome === "Abortion"
                        ? "modeOfAbortion"
                        : "modeOfManagement",
                      "Medical"
                    )
                  }
                  style={{
                    height: "41px",
                    padding: "5px 20px 0 20px",
                  }}
                  className="custom-radio-button"
                >
                  Medical
                </Radio.Button>
                <Radio.Button
                  value={"Surgical"}
                  onClick={() =>
                    handlePastPregnancyDataChange(
                      pastPregnancyData.outcome === "Abortion"
                        ? "modeOfAbortion"
                        : "modeOfManagement",
                      "Surgical"
                    )
                  }
                  style={{
                    height: "41px",
                    padding: "5px 20px 0 20px",
                  }}
                  className="custom-radio-button"
                >
                  Surgical
                </Radio.Button>
              </Radio.Group>
            </div>
          </>
        )}
      </div>
    );
  }, [pastPregnancyData]);

  const closeBtnHandler = () => {
    if (isDataAddedOrEdited && !isCompletePregnancy) {
      toggleDeletePopup();
    } else {
      close();
    }
  };

  const toggleConfirmationPopup = () => {
    setShowConfirmPopup((prev) => !prev);
  };

  const obstetricSaveBtnHandler = async () => {
    let newPastPregnancy = [...pregnancyHistory] || [];
    const data = {};
    Object.keys(pastPregnancyData).forEach((key) => {
      if (![undefined, null, ""].includes(pastPregnancyData[key])) {
        data[key] =
          key === "remarks"
            ? pastPregnancyData[key]?.trim()
            : pastPregnancyData[key];
      }
    });
    if (pregnancyHistory?.length > 0 && editIndex >= 0) {
      newPastPregnancy[editIndex] = {
        ...data,
        dateOfDelivery: data?.dateOfDelivery
          ? new Date(data?.dateOfDelivery).toISOString()
          : undefined,
        modifiedAt: new Date().toISOString(),
        modifiedBy: userId,
      };
    } else {
      newPastPregnancy = [
        ...pregnancyHistory,
        {
          ...data,
          dateOfDelivery: data?.dateOfDelivery
            ? new Date(data?.dateOfDelivery).toISOString()
            : undefined,
          examinationHistory: [],
          ancHistory: [],
          immunisationHistory: [],
          createdAt: new Date().toISOString(),
          createdBy: userId,
          modifiedAt: new Date().toISOString(),
          modifiedBy: userId,
        },
      ];
    }
    const payload = {
      ...allObstetricDetails,
      pregnancyHistory: newPastPregnancy,
    };

    dispatch(addObstetricDetails(payload));
    dispatch(resetUpdatedPatientDiagnosis());
    setDoneLoader(true);
    const obstetricResponse = await upsertObstetricDetails(
      patient_data.patient_unique_id,
      payload
    );
    setDoneLoader(false);
    if (obstetricResponse) {
      const clinic_name = getClinicName(profile?.hospital_data);
      const attributes = {
        clinic_name,
        doctor_id: profile?.doctor_unique_id,
        patient_number: patient_data?.pm_contact_no,
        patient_id: patient_data?.patient_unique_id,
      };
      window.Moengage.track_event("TP_Obs_history_updated", attributes);
      window.Moengage.track_event("TP_Past_pregnancy_updated", attributes);
      message.open({
        key: MESSAGE_KEY,
        type: "",
        className: "message-appointment",
        content: (
          <div className="d-flex align-items-center">
            <img src={visitEnd} className="me-3" />
            <div>
              <div className="fontroboto text-start fw-normal mt-1">
                Past Pregnancy Details added successfully
              </div>
            </div>
            <img
              src={imgCloseVisit}
              className="ms-3"
              onClick={() => message.destroy()}
            />
          </div>
        ),
        duration: 5,
      });
    } else {
      errorMessage("Error while adding data");
    }

    close();
  };

  return (
    <>
      <Card bordered={false} className="search-modalCard">
        <div
          className="modalCard-header h-60 align-items-center justify-content-between d-flex"
          style={{
            position: "sticky",
            top: "0px",
            zIndex: 2,
          }}
        >
          <div className="align-items-center d-flex">
            <Button
              type="text"
              className="btn btn-delete-prescription px-3 focus-none h-100"
              onClick={closeBtnHandler}
            >
              <i className="icon-Cross fs-3"></i>
            </Button>
            <div className="modal-title">
              {isCompletePregnancy
                ? "Complete Pregnancy"
                : "Past pregnancy details"}
            </div>
          </div>
          <Button
            onClick={
              isCompletePregnancy
                ? toggleConfirmationPopup
                : isPregnancyCompleted
                ? obstetricSaveBtnHandler
                : addPastPregnancyData
            }
            className="btn btn-primary3 btn-41 px-4 me-20"
            disabled={
              !pastPregnancyData.gravidity || !pastPregnancyData.outcome
            }
            loading={doneLoader}
          >
            {isCompletePregnancy
              ? "Complete Pregnancy"
              : isPregnancyCompleted
              ? "Save"
              : "Done"}
          </Button>
        </div>

        <div className="p-20">
          <div className="past-pregnancy-wrapper">
            <div className="past-pregnancy-wrap-body past-pregnancy-parent-width">
              <div className="past-pregnancy-head">Parameter</div>
              <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5">
                Gravida number <span className="lab-params-warning">*</span>
              </div>
              <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5">
                Outcome <span className="lab-params-warning">*</span>
              </div>
              {["Live", "Still birth"].includes(pastPregnancyData.outcome) && (
                <>
                  <div className="past-pregnancy-row past-pregnancy-row-40 d-flex align-items-center px-2 py-5">
                    Term length
                  </div>
                  <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5">
                    Delivery mode
                  </div>
                  <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5">
                    Select birth info
                  </div>
                  {pastPregnancyData?.typeOfDelivery && (
                    <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5">
                      <div className="birth-info">
                        Add Date of delivery (DOD) or Age(in years& month)
                      </div>
                    </div>
                  )}
                  <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5">
                    Gender
                  </div>
                  <div className="past-pregnancy-row past-pregnancy-row-60 d-flex align-items-center px-2 py-5">
                    Baby's weight
                  </div>
                </>
              )}
              {["Ectopic", "Abortion"].includes(pastPregnancyData.outcome) && (
                <div className="past-pregnancy-row past-pregnancy-row-40 d-flex align-items-center px-2 py-5">
                  Period of GA
                </div>
              )}
              {pastPregnancyData.outcome === "Ectopic" && (
                <div className="past-pregnancy-row past-pregnancy-row-40 d-flex align-items-center px-2 py-5">
                  Location
                </div>
              )}
              {pastPregnancyData.outcome === "Abortion" && (
                <div className="past-pregnancy-row past-pregnancy-row-40 d-flex align-items-center px-2 py-5">
                  Type of Miscarriage
                </div>
              )}
              {["Ectopic", "Abortion"].includes(pastPregnancyData.outcome) && (
                <div className="past-pregnancy-row past-pregnancy-row-40 d-flex align-items-center px-2 py-5">
                  Mode of{" "}
                  {pastPregnancyData.outcome === "Ectopic"
                    ? "Management"
                    : "Miscarriage"}
                </div>
              )}
            </div>
            <div
              ref={scrollContainerRef}
              className="d-flex overflow-x-auto scrollvitals"
            >
              {TABLE_PAST_PREGNANCY}
            </div>
          </div>
          {!!pastPregnancyData.outcome && (
            <>
              <div className="remarks px-2 py-2">
                {isCompletePregnancy ? "Postpartum Remark" : "Note"}
              </div>
              <div className="remarks px-2 py-2">
                <Input.TextArea
                  placeholder="Enter remarks"
                  className="textareaPlaceholder"
                  rows={3}
                  value={pastPregnancyData.remarks}
                  onChange={(e) =>
                    handlePastPregnancyDataChange("remarks", e.target.value)
                  }
                  autoComplete="off"
                  autoCorrect="off"
                />
              </div>
            </>
          )}
        </div>
      </Card>
      <CommonModal
        isModalOpen={shouldShowConfirmPopup}
        onCancel={toggleConfirmationPopup}
        modalWidth={500}
        title={"Confirm Complete Pregnancy"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  Once you close this pregnancy, you will no longer be able to
                  edit the patient’s visit information or diagnosis notes, and
                  it cannot be reopened.
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={() => {
                    toggleConfirmationPopup();
                    close();
                  }}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  {isCompletePregnancy ? "No, Keep It Open" : "Yes Leave"}
                </div>
                <Button
                  onClick={addPastPregnancyData}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
                  <span>Yes, Complete Pregnancy</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    </>
  );
}

export default React.memo(PastPregnancy);
