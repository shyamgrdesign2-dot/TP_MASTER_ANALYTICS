import React from "react";
import { fetchObstetricDetails } from "./service";

export default function useObstetric(patientId, doctorId) {
  const [obstetrics, setObstetrics] = React.useState([]);

  React.useEffect(() => {
    getObstetrics();
  }, []);

  const getObstetrics = async () => {
    const res = await fetchObstetricDetails(patientId, doctorId, true);
    setObstetrics(res);
  };

  return obstetrics;
}
