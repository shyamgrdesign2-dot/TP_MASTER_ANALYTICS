import React from "react";
import { useLocation } from "react-router-dom";

import { ADD } from "../utils/constants";

import PatientForm from "../components/PatientForm";

function AddNewPatient() {

    const { state } = useLocation();
    const { patient_data } = state != null && state

    return (
        <PatientForm mode={ADD} patient_data={patient_data} />
    );

}
export default React.memo(AddNewPatient);
