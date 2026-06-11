/* eslint-disable react-hooks/exhaustive-deps */
import { Modal, DatePicker, Button } from "antd";
import { useEffect, useState } from "react";
import { createPatient, updateDob } from "../../service";
import { errorMessage, getTokenData } from "../../../../utils/utils";
import moment from "moment";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import "./AddDOB.scss";
import { viewPatient } from "../../../../redux/appointmentsSlice";
import { getDecodedToken } from "../../../../utils/localStorage";

const AddDOB = ({
  show,
  setShowDob,
  patientDetails,
  handleDrawerVaccination,
  getVaccineDetails,
  setLoading,
}) => {
  const dispatch = useDispatch();
  const [dob, setDob] = useState("");
  const { profile } = useSelector((state) => state.doctors);
  const decodedToken = getDecodedToken();
  const hospital_bid = decodedToken?.result?.hospital_business_id;

  useEffect(() => {
    if (patientDetails.DOB) {
      setDob(moment(patientDetails.DOB, "Do MMMM YYYY").format("DD-MM-YYYY"));
    } else if (patientDetails.pm_dob) {
      setDob(moment(patientDetails.pm_dob).format("DD-MM-YYYY"));
    }
  }, []);

  const createPatientDetails = async () => {
    const payload = {
      patient_uid: patientDetails?.patient_unique_id,
      patient_pid: patientDetails?.pm_pid,
      hospital_bid:
        patientDetails?.hm_business_id ||
        patientDetails?.hospital_business_id ||
        hospital_bid,
      hospital_id: patientDetails?.hm_id || profile?.hospital_data?.[0]?.hm_id,
      patient_first_name: patientDetails?.pm_first_name || "",
      patient_middle_name: patientDetails?.pm_middle_name || "",
      patient_last_name: patientDetails?.pm_last_name || "",
      patient_gender: patientDetails?.pm_gender,
      patient_dob: moment(dob, "DD-MM-YYYY").format("YYYY-MM-DD"),
      patient_contact_no: patientDetails?.pm_contact_no,
    };
    const createPatientRes = await createPatient(payload);
    if (createPatientRes?.status === 200) {
      updatePatientDob();
      getVaccineDetails();
      setShowDob(false);
      setLoading(true);
    } else {
      errorMessage({ name: "TypeError" });
    }
  };

  const updatePatientDob = async () => {
    const payload = {
      patient_uid: patientDetails?.patient_unique_id,
      patient_pid: patientDetails?.vac_pid || patientDetails?.pm_pid,
      hospital_bid:
        patientDetails?.hm_business_id ||
        patientDetails?.hospital_business_id ||
        hospital_bid,
      hospital_id: patientDetails?.hm_id || profile?.hospital_data?.[0]?.hm_id,
      updated_dob: moment(dob, "DD-MM-YYYY").format("YYYY-MM-DD"),
    };
    const createPatientRes = await updateDob(payload);
    if (createPatientRes?.status === 200) {
      getVaccineDetails();
      setShowDob(false);
      setLoading(true);
      const sendData = {
        patient_unique_id: patientDetails.patient_unique_id,
      };
      dispatch(viewPatient(sendData));
    } else {
      errorMessage({ name: "TypeError" });
    }
  };

  const addDobHandler = () => {
    if (!patientDetails?.vac_id) {
      createPatientDetails();
    } else {
      updatePatientDob();
    }
  };

  return (
    <Modal
      title="Add Date of Birth"
      width={"462px"}
      open={show}
      footer={null}
      closeIcon={null}
    >
      <p style={{ opacity: 0.5 }}>
        Please enter the patient's date of birth for accurate vaccination
        scheduling and due date calculations
      </p>
      <div className="d-flex flex-column gap-4">
        <div>Date of birth</div>
        <DatePicker
          placeholder="Select Date"
          dropdownClassName="addDOB-picker-dropdown"
          onChange={(_, d) => {
            setDob(d);
          }}
          format="DD-MM-YYYY"
          value={dob ? dayjs(dob, "DD-MM-YYYY") : ""}
        />

        <Button
          disabled={!dob}
          className={`${!dob ? "opacity-50" : ""}`}
          style={{ backgroundColor: "#4B4AD5" }}
          type="primary"
          onClick={addDobHandler}
        >
          Add
        </Button>
        <Button
          className="border-0 opacity-50 shadow-none text-secondary"
          onClick={() => {
            handleDrawerVaccination();
            setShowDob(false);
          }}
        >
          Close vaccination chart
        </Button>
      </div>
    </Modal>
  );
};

export default AddDOB;
