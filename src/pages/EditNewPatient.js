import React from "react";
import { useLocation } from "react-router-dom";

import { EDIT } from "../utils/constants";

import PatientForm from "../components/PatientForm";

function EditNewPatient() {

    const { state } = useLocation();
    const { patient_data } = state || {};

    return (
        <PatientForm mode={EDIT} patient_data={patient_data} />
    );

}
export default React.memo(EditNewPatient);
