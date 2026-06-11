import { Button, DatePicker, Modal, message } from "antd";
import { useState } from "react";
import dayjs from "dayjs";
import "./LmpPopup.scss";
import { isBrowser } from "react-device-detect";

import { MESSAGE_KEY } from "../../../../utils/constants";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import {
  addObstetricDetails,
  obstetricDetailsUpdated,
} from "../../../../redux/obstetricSlice";
import { useSelector } from "react-redux";
import { ASSETS } from "../../../../assets";
const {
  closeVisit: imgCloseVisit,
  checkBadge: visitEnd,
} = ASSETS.images;

const LmpPopup = ({
  lmpDate,
  setLmpDate,
  setShowLmpPopup,
  isPregnancyCompleted,
  setPatientDiagnosisData,
}) => {
  const dispatch = useDispatch();
  const { state } = useLocation();
  const { patient_data } = state;

  const { obstetricDetails: allObstetricDetails } = useSelector(
    (state) => state.obstetric
  );

  const [isContinueBtnDisabled, setContinueBtnDisabled] = useState(true);

  const continueBtnHandler = () => {
    if (!isContinueBtnDisabled) {
      lmpPopupHandler();
    }
  };

  const lmpPopupHandler = (laterBtn) => {
    if (isPregnancyCompleted) {
      message.open({
        key: MESSAGE_KEY,
        type: "",
        className: "message-appointment",
        content: (
          <div className="d-flex align-items-center">
            <img src={visitEnd} className="me-3" />
            <div>
              <div className="fontroboto text-start fw-normal mt-1">
                {patient_data?.pm_fullname}’s <b>New Pregnancy</b> started
                successfully
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
      const payload = {
        ...allObstetricDetails,
        currentPregnancy: {
          examinationHistory: [],
          ancHistory: [],
          immunisationHistory: [],
        },
      };
      dispatch(addObstetricDetails(payload));
      dispatch(obstetricDetailsUpdated());
    }
    if (laterBtn) {
      setLmpDate("");
      setPatientDiagnosisData((prevState) => ({
        ...prevState,
        lmp: null,
        edd: undefined,
        gestationWeeks: undefined,
        gestationDays: undefined,
      }));
    }
    setShowLmpPopup(false);
  };

  return (
    <Modal
      width={"422px"}
      open={true}
      footer={null}
      closeIcon={null}
      className={"lmpModal"}
      title={
        <div style={{ borderRadius: "24px" }}>
          <div style={{ padding: "20px 24px 0px 24px" }}>
            Enter Patient's LMP
          </div>
          <hr style={{ borderTop: "1px solid #ccc" }} />
        </div>
      }
    >
      <div style={{ padding: "0px 24px 20px 24px" }}>
        <div
          style={{
            marginBottom: 20,
            marginTop: 20,
          }}
        >
          <div style={{ marginBottom: 15 }}>
            <label style={{ marginBottom: 8 }} className="lmpLabel">
              LMP date
            </label>
            <DatePicker
              placeholder="Select Date"
              onChange={(_, d) => {
                setLmpDate(d ? dayjs(d, "DD-MM-YYYY").toISOString() : "");
                setContinueBtnDisabled(false);
              }}
              format={{
                format: "DD-MM-YYYY",
                type: "mask",
              }}
              value={lmpDate ? dayjs(lmpDate) : ""}
              style={{
                height: "38px",
                width: "374px",
              }}
              disabledDate={(current) => current && current > dayjs()}
              inputReadOnly={!isBrowser}
            />
          </div>
        </div>
        <div className="d-flex">
          <Button
            style={{
              marginRight: 20,
              borderColor: "#4B4AD5",
            }}
            className="lmpBtn"
            onClick={() => lmpPopupHandler(true)}
          >
            <span className="lmpBtnTxt">Do it later</span>
          </Button>
          <Button
            className={`lmpBtn ${isContinueBtnDisabled ? "disabledBtn" : ""}`}
            type="primary"
            onClick={continueBtnHandler}
          >
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LmpPopup;
