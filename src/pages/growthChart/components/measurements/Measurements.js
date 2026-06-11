import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Button, Card, DatePicker, Input, Tooltip } from "antd";
import { errorMessage, onlyDecimalFormat } from "../../../../utils/utils";

import CashManagerContext from "../../../../context/CashManagerContext";
import moment from "moment";
import { addGrowthChartParam, updateGrowthChartParam } from "../../service";
import SuccessPopup from "../SuccessPopup";
import { addMeasurements } from "../../../../redux/growthChartSlice";
import { useDispatch, useSelector } from "react-redux";
import { getClinicName } from "../../../../utils/utils";

const dateFormat = "YYYY-MM-DD";
const showDateFormat = "DD MMM, YY";

function Measurements(props) {
  const scrollContainerRef = useRef(null);
  const inputRef = useRef([]);
  const { profile } = useSelector((state) => state.doctors);
  const {
    handleDrawerMeasurements,
    measurementsToEdit,
    getGrowthChartDetails,
    setMeasurementsToEdit,
    allGrowthChartParams,
    onGrowthUpdated,
  } = props;

  const { patient_data } = useContext(CashManagerContext);
  const [measurementsData, setMeasurementsData] = useState([
    {
      date: moment().format(dateFormat),
      height: "",
      weight: "",
      ofc: "",
      bmi: calculate("", "")?.bmi,
    },
  ]);
  const [dateString, setDateString] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const dispatch = useDispatch();
  const { selectedVitalsList } = useSelector((state) => state.vitals);
  const { measurements } = useSelector((state) => state.growthChart);
  const [loader, setLoader] = useState(false);

  useEffect(() => {
    if (allGrowthChartParams?.length) {
      setMeasurementsData(
        allGrowthChartParams?.map((p) => ({
          ...p,
          date: moment(p?.tcbc_created_date).format(dateFormat),
        }))
      );
    } else if (measurements?.length) {
      setMeasurementsData([...measurements]);
    } else if (selectedVitalsList?.length) {
      let cal = calculate("", "");
      setMeasurementsData(
        selectedVitalsList?.map((v) => ({
          date: v.date,
          height: v.height || "",
          weight: v.weight || "",
          ofc: v.ofc || "",
          bmi: v.bmi || cal.bmi,
        }))
      );
    }
  }, [selectedVitalsList, measurements, allGrowthChartParams]);

  useEffect(() => {
    if (measurementsToEdit?.tcbc_id)
      setMeasurementsData([
        {
          ...measurementsToEdit,
          date: moment(measurementsToEdit?.tcbc_created_date).format(
            dateFormat
          ),
        },
      ]);
  }, [measurementsToEdit]);

  const onChange = useCallback(
    (date, dateString) => {
      let cal = calculate("", "");
      const vitalData = selectedVitalsList?.find((v) => v.date === dateString);
      const { height, weight, bmi } = vitalData || {};
      const tempMeasurements = [...measurementsData];
      setDateString(dateString);
      tempMeasurements.push({
        date: dateString,
        height: height || "",
        weight: weight || "",
        bmi: bmi || cal.bmi,
        ofc: "",
      });
      setMeasurementsData([...tempMeasurements]);
    },
    [measurementsData]
  );

  useEffect(() => {
    if (scrollContainerRef.current) {
      // const scrollWidth = scrollContainerRef.current.scrollWidth;
      // scrollContainerRef.current.scrollLeft = scrollWidth;
      const data = measurementsData.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      const index = data.findLastIndex((e) => e.date == dateString);
      if (index !== -1) {
        inputRef.current[index].focus();
        const scrollWidth = index;
        scrollContainerRef.current.scrollLeft = scrollWidth * 180;
      }
    }
  }, [measurementsData.length]);

  function calculate(H, W) {
    let height = 0,
      weight = 0,
      bmi = "";

    if (H != "" && H != 0) {
      height = parseFloat(H);
    } else {
      height = 0;
    }

    if (W != "" && W != 0) {
      weight = parseFloat(W);
    } else {
      weight = 0;
    }

    const calBMI = (weight / height / height) * 10000;
    bmi = weight && height ? (isFinite(calBMI) ? calBMI.toFixed(2) : "") : "";

    return { bmi };
  }

  const onChangeInput = useCallback(
    (value, i, flag) => {
      const updateValue = onlyDecimalFormat(value);
      if (flag === 1) {
        measurementsData[i].height = updateValue;
        let cal = calculate(updateValue, measurementsData[i].weight);
        measurementsData[i].bmi = cal.bmi;
      } else if (flag === 2) {
        measurementsData[i].weight = updateValue;
        let cal = calculate(measurementsData[i].height, updateValue);
        measurementsData[i].bmi = cal.bmi;
      } else if (flag === 3) {
        measurementsData[i].ofc = updateValue;
      }
      setMeasurementsData((prev) => [...prev]);
    },
    [measurementsData]
  );

  const trackUpdateEvent = () => {
    const clinic_name = getClinicName(profile?.hospital_data);
    const attributes = {
      clinic_name,
      doctor_id: profile?.doctor_unique_id,
      patient_number: patient_data?.pm_contact_no,
      patient_id: patient_data?.patient_unique_id,
    };
    window.Moengage.track_event("TP_Growth_Chart_updated", attributes);
  };

  const onAddGrowthData = async () => {
    setLoader(true);
    const result = measurementsData.map(async (measurement) => {
      const { height, weight, ofc, date, bmi } = measurement;
      if (!height && !weight && !ofc && measurementsData?.length === 1) return;
      const payload = {
        date,
        height,
        weight,
        bmi,
        ofc,
        pm_id: patient_data?.pm_id,
        pm_pid: patient_data?.pm_pid,
        patient_unique_id: patient_data?.patient_unique_id,
        pam_id: patient_data?.pam_id || 0,
      };
      const existing = allGrowthChartParams?.find(
        (p) =>
          moment(p.tcbc_created_date).format(dateFormat) === measurement.date
      );
      const addMeasurementsRes =
        measurementsToEdit?.tcbc_id || measurement?.tcbc_id || existing
          ? await updateGrowthChartParam(
              {
                id:
                  measurementsToEdit?.tcbc_id ||
                  measurement?.tcbc_id ||
                  existing?.tcbc_id,
                pm_id: patient_data?.pm_id,
                pm_pid: patient_data?.pm_pid,
              },
              payload
            )
          : await addGrowthChartParam(payload);
      if (addMeasurementsRes?.tcbc_id || addMeasurementsRes?.status === 204) {
        trackUpdateEvent();
        dispatch(
          addMeasurements({ ...payload, tcbc_id: addMeasurementsRes?.tcbc_id })
        );
      }
      return addMeasurementsRes;
    });

    const updateGrowthRes = await Promise.all(result);
    setLoader(false);
    if (
      updateGrowthRes?.some((res) => res?.tcbc_id) ||
      updateGrowthRes?.some((res) => res?.status === 204)
    ) {
      getGrowthChartDetails();
      onGrowthUpdated?.();
      setMeasurementsToEdit([]);
      setShowSuccess(true);
      setTimeout(() => {
        handleDrawerMeasurements();
      }, 1000);
    }
  };

  const TABLE_MEASUREMENTS = useMemo(() => {
    return (
      measurementsData.length > 0 &&
      measurementsData
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((item, i) => {
          return (
            <div
              key={i}
              className="gc-measurements-wrap-body w-100 gc-measurements-child-width"
            >
              <div className="gc-measurements-head rounded-start-0 w-100">
                {moment(item.date).format(showDateFormat)}
              </div>
              <div className="gc-measurements-row gc-measurements-row-60 d-flex align-items-center px-2 py-5 w-100">
                <Input
                  ref={(el) => (inputRef.current[i] = el)}
                  className="inputheight41-group focused"
                  placeholder="Enter"
                  inputMode="numeric"
                  value={item.height}
                  addonAfter={"cms"}
                  onChange={(e) => onChangeInput(e.target.value, i, 1)}
                />
              </div>
              <div className="gc-measurements-row gc-measurements-row-60 d-flex align-items-center px-2 py-5 w-100">
                <Input
                  className="inputheight41-group"
                  placeholder="Enter"
                  inputMode="numeric"
                  value={item.weight}
                  addonAfter={"kgs"}
                  onChange={(e) => onChangeInput(e.target.value, i, 2)}
                />
              </div>
              <div className="gc-measurements-row gc-measurements-row-40 d-flex align-items-center px-2 py-5 w-100">
                <div className="fs-14 ">{`${
                  item.bmi ? parseFloat(item.bmi).toFixed(2) : "--"
                } kg/m²`}</div>
              </div>

              <div className="gc-measurements-row gc-measurements-row-60 d-flex align-items-center px-2 py-5 w-100">
                <Input
                  className="inputheight41-group"
                  placeholder="Enter"
                  inputMode="numeric"
                  value={item.ofc}
                  addonAfter={"cms"}
                  onChange={(e) => onChangeInput(e.target.value, i, 3)}
                />
              </div>
            </div>
          );
        })
    );
  }, [measurementsData]);

  const disabledDate = (current) => {
    return current && current >= moment().add(1, "days").startOf("day");
  };

  return (
    <>
      <Card bordered={false} className="search-modalCard ">
        <div className="modalCard-header h-60 align-items-center justify-content-between d-flex">
          <div className="align-items-center d-flex">
            <Button
              type="text"
              className="btn btn-delete-prescription px-3 focus-none h-100"
              onClick={() => {
                setMeasurementsToEdit([]);
                handleDrawerMeasurements();
              }}
            >
              <i className="icon-Cross fs-3"></i>
            </Button>
            <div className="modal-title">Measurements</div>
          </div>
          <Button
            onClick={onAddGrowthData}
            className="btn btn-primary3 btn-41 px-4 me-20"
            loading={loader}
            disabled={loader}
          >
            Done
          </Button>
        </div>
        <div className="align-items-center d-flex justify-content-between px-20 py-3">
          <div className="position-relative">
            <Button name="dateBtn" className="btn btn-primary2 btn-41">
              Add New Date
            </Button>
            <DatePicker
              key={"date"}
              suffixIcon={null}
              inputReadOnly
              onChange={onChange}
              disabledDate={disabledDate}
              className="calender-vitals w-100 h-100"
            />
          </div>
        </div>
        {measurementsData.length > 0 && (
          <div className="px-20">
            <div className="gc-measurements-wrapper w-100">
              <div className="gc-measurements-wrap-body gc-measurements-parent-width">
                <div className="gc-measurements-head">Name</div>
                <div className="gc-measurements-row gc-measurements-row-60 d-flex align-items-center px-2 py-5">
                  Height
                </div>
                <div className="gc-measurements-row gc-measurements-row-60 d-flex align-items-center px-2 py-5">
                  Weight
                </div>
                <div className="gc-measurements-row gc-measurements-row-40 d-flex align-items-center px-2 py-5">
                  BMI
                  <Tooltip
                    placement="right"
                    title="Body mass index will be auto-calculated by entering Height and Weight"
                  >
                    <i className="icon-info ms-1"></i>
                  </Tooltip>
                </div>
                <div className="gc-measurements-row gc-measurements-row-60 d-flex align-items-center px-2 py-5">
                  OFC
                </div>
              </div>
              <div
                ref={scrollContainerRef}
                className="d-flex overflow-x-auto scrollvitals w-100"
              >
                {TABLE_MEASUREMENTS}
              </div>
            </div>
          </div>
        )}
      </Card>
      <SuccessPopup show={showSuccess} setShow={setShowSuccess} />
    </>
  );
}

export default React.memo(Measurements);
