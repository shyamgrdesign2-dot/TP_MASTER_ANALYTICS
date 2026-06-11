import {
  AutoComplete,
  Button,
  DatePicker,
  Input,
  Select,
  Switch,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { useCallback, useEffect, useState } from "react";
import { AncSchedulerColumns } from "../../utils/constants";
import {
  mergeDefaultAndDoctorList,
  splitByTrimester,
  updateEnablePrint,
} from "../../utils/helper";
import "./AncScheduler.scss";
import AncImmunisationPopup from "../ancImmunisationPopup/AncImmunisationPopup";
import { removeBeforeWhiteSpace } from "../../../../utils/utils";
import AncPrintPreview from "../ancPrintPreview/AncPrintPreview";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import {
  addObstetricDetails,
  obstetricDetailsUpdated,
  patientDiagnosisUpdated,
} from "../../../../redux/obstetricSlice";
import { fetchSearchAnc } from "../../service";
import { isBrowser } from "react-device-detect";

const AncScheduler = ({
  ancHistory = [],
  handleDrawerMedicalReport,
  isPreviousPregnancyOverview,
}) => {
  const dispatch = useDispatch();
  const { state } = useLocation();
  const { patient_data } = state || {};
  const { userId } = useSelector((state) => state.doctors);
  const {
    obstetricDetails: allObstetricDetails,
    defaultAncSchedule,
    ancDoctorList,
  } = useSelector((state) => state.obstetric);
  const obstetricDetails = allObstetricDetails?.currentPregnancy || {};
  const [ancSchedulerData, setAncSchedulerData] = useState([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [immunisationPopup, setImmunisationPopup] = useState("");
  const [editIndex, setEditIndex] = useState(-1);
  const [searchSelected, setSearchSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [shouldShowPrintPreview, setShouldShowPrintPreview] = useState(false);

  const getSearchOptions = async () => {
    const searchOptionsRes = await fetchSearchAnc(
      searchQuery,
      patient_data.patient_unique_id
    );
    const data = [];
    searchOptionsRes?.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e }),
        value: e.id,
        label: <div>{e.name}</div>,
      });
    });
    searchQuery &&
      data.push({
        key: JSON.stringify({
          change: 1,
          name: searchQuery,
        }),
        value: searchQuery,
        label: (
          <>
            <div>
              {searchQuery}
              <i className="icon-Add mx-1 text-primary fs-6"></i>{" "}
              <a className="fw-medium text-decoration-underline text-primary">
                {" "}
                Add Custom
              </a>
            </div>
          </>
        ),
        isCustom: true,
      });
    setSearchOptions(data);
  };

  useEffect(() => {
    if (ancHistory?.length) {
      setAncSchedulerData(splitByTrimester(updateEnablePrint(ancHistory)));
    }
  }, [ancHistory]);

  useEffect(() => {
    if (!isPreviousPregnancyOverview) {
      const ancHistoryData = ancHistory || [];
      let newAncHistory = mergeDefaultAndDoctorList(
        ancHistoryData,
        defaultAncSchedule,
        ancDoctorList,
        userId,
        true
      );
      newAncHistory = newAncHistory.sort((a, b) => {
        if (a.weekRange.start === b.weekRange.start) {
          return a.weekRange.end - b.weekRange.end;
        }
        return a.weekRange.start - b.weekRange.start;
      });
      const payload = {
        ...allObstetricDetails,
        currentPregnancy: {
          ...obstetricDetails,
          ancHistory: newAncHistory,
        },
      };
      dispatch(addObstetricDetails(payload));
    }
    if (obstetricDetails?.lmp) {
      const today = moment();
      const lmp = moment(obstetricDetails?.lmp);
      const gestationInWeeks = today.diff(lmp, "weeks");
      if (gestationInWeeks <= 40 && gestationInWeeks >= 28) {
        setActiveCategory(2);
      } else if (gestationInWeeks <= 27 && gestationInWeeks >= 13) {
        setActiveCategory(1);
      } else {
        setActiveCategory(0);
      }
    }
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const timeOutId = setTimeout(() => {
        getSearchOptions();
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      setSearchOptions([]);
    }
  }, [searchQuery]);

  const trimesterList = [
    "First Trimester",
    "Second Trimester",
    "Third Trimester",
  ];

  const disabledDate = (current) => {
    return current && current < moment().add(0, "days").startOf("day");
  };

  const renderTableHeader = () => {
    const tableColumns = isPreviousPregnancyOverview
      ? AncSchedulerColumns?.slice(0, -2)
      : AncSchedulerColumns;
    return (
      <tr>
        {tableColumns?.map((header, index) => (
          <th
            key={index}
            className="obstetricTcell theaderCellStyle"
            style={{
              width: header.width,
              fontWeight: 600,
            }}
          >
            {header.title}
            {header.key === "enablePrint" && (
              <Tooltip
                key={index}
                title={
                  <div>
                    Enable the toggle to show test details in the Rx Print
                  </div>
                }
                overlayClassName="ancTooltip"
                placement="topLeft"
              >
                <i
                  className="icon-info ms-1 me-1"
                  style={{
                    cursor: "pointer",
                    color: "#A2A2A8",
                    fontSize: "18px",
                  }}
                />
              </Tooltip>
            )}
          </th>
        ))}
      </tr>
    );
  };

  const renderTableData = () => {
    const handleImmunisationChange = (key, index, value, isOnBlur) => {
      const updatedData = ancSchedulerData.map((innerArray, trimesterIndex) => {
        const newArray = [...innerArray];
        if (trimesterIndex === activeCategory) {
          newArray[index] = {
            ...newArray[index],
            [key]: value,
            modifiedAt: new Date().toISOString(),
            modifiedBy: userId,
          };

          if (key !== "enablePrint" && !isOnBlur) {
            newArray[index] = {
              ...newArray[index],
              enablePrint: true,
            };
          }
          return newArray;
        } else {
          return newArray;
        }
      });
      setAncSchedulerData(updatedData);
      const newAncHistory = updatedData?.flat();
      const payload = {
        ...allObstetricDetails,
        currentPregnancy: {
          ...obstetricDetails,
          ancHistory: newAncHistory,
        },
      };
      dispatch(addObstetricDetails(payload));
      dispatch(obstetricDetailsUpdated());
      dispatch(patientDiagnosisUpdated());
    };

    return ancSchedulerData?.[activeCategory]?.map((item, i) => {
      const { master, weekRange, status, dueDate, notes, enablePrint } = item;
      return (
        <tr key={i}>
          <td className="obstetricTcell">{master?.name}</td>
          <td className="obstetricTcell weekRange">
            {`${weekRange?.start} - ${weekRange?.end} weeks`}
            {!master?.default && !isPreviousPregnancyOverview && (
              <i
                className="icon-Edit fs-6 d-flex justify-content-end"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setEditIndex(i);
                  setImmunisationPopup("edit");
                }}
              />
            )}
          </td>
          <td className="obstetricTcell">
            <DatePicker
              key={"date"}
              onChange={(date) => {
                const formattedDate = date?.toISOString();
                handleImmunisationChange("dueDate", i, formattedDate);
              }}
              disabledDate={disabledDate}
              value={dueDate ? dayjs(moment(dueDate)) : ""}
              className="ancSchedulerBox"
              format={{
                format: "DD-MM-YYYY",
                type: "mask",
              }}
              disabled={isPreviousPregnancyOverview}
              inputReadOnly={!isBrowser}
            />
          </td>
          <td className="obstetricTcell">
            <Select
              style={{ padding: 0 }}
              onChange={(value) => handleImmunisationChange("status", i, value)}
              options={[
                { value: "Due", label: "Due" },
                { value: "Completed", label: "Completed" },
              ]}
              placeholder="Select"
              className={`ancSchedulerBox custom-immunisation-select ${
                status === "Completed" ? "custom-immunisation-given-select" : ""
              }`}
              value={status || "Due"}
              allowClear={false}
              disabled={isPreviousPregnancyOverview}
            />
          </td>

          <td className="obstetricTcell">
            <Input.TextArea
              placeholder="Notes"
              value={notes}
              onChange={(e) =>
                handleImmunisationChange("notes", i, e.target.value)
              }
              onBlur={(e) => {
                // Trim only when the user leaves the input field (onBlur)
                const trimmedValue = e.target.value.trim();
                handleImmunisationChange("notes", i, trimmedValue, true);
              }}
              className="textareaPlaceholder immunisationRemarks"
              disabled={isPreviousPregnancyOverview}
            />
          </td>
          {!isPreviousPregnancyOverview && (
            <>
              <td className="obstetricTcell">
                <Switch
                  checked={enablePrint}
                  onChange={() =>
                    handleImmunisationChange("enablePrint", i, !enablePrint)
                  }
                />
              </td>
              <td className="obstetricTcell">
                {master?.default ? (
                  <Tooltip
                    title={<div>Default ANC Scheduler cannot be deleted</div>}
                    overlayClassName="ancTooltip"
                    placement="topLeft"
                  >
                    <i className="icon-delete" style={{ color: "#A2A2A8" }} />
                  </Tooltip>
                ) : (
                  <Button
                    className="btn btn-delete-prescription p-0"
                    onClick={() => {
                      setImmunisationPopup("delete");
                      setEditIndex(i);
                    }}
                  >
                    <i className="icon-delete" style={{ color: "#454551" }} />
                  </Button>
                )}
              </td>
            </>
          )}
        </tr>
      );
    });
  };

  const onSelect = (value, option) => {
    setImmunisationPopup("add");
    setSearchQuery("");
    const key = option.key && JSON.parse(option.key);
    setSearchSelected({ ...key, isCustom: option.isCustom });
  };

  const onSearch = useCallback(
    (query) => {
      setSearchQuery(removeBeforeWhiteSpace(query));
    },
    [searchQuery]
  );

  return (
    <div>
      <div
        className="d-flex justify-content-between"
        style={{ padding: "5px 40px" }}
      >
        <div className="medical-records d-flex" style={{ gap: 16 }}>
          {trimesterList?.map((item, index) => (
            <Button
              type="text"
              key={index}
              className={`btnStyle btn px-5-16 fs-14 category-btn ${
                index === activeCategory ? "active-category-btn" : ""
              }`}
              onClick={() => setActiveCategory(index)}
              style={{ height: 42 }}
            >
              <span
                className={`btnText category-label ${
                  index === activeCategory ? "active-category-label" : ""
                }`}
              >
                {item}
              </span>
            </Button>
          ))}
        </div>
        {!isPreviousPregnancyOverview && (
          <div>
            <Button
              type="button"
              className="btn-41 btn ant-btn-text btn-input anotherVisitBtn d-flex align-items-center"
              onClick={() => setShouldShowPrintPreview(true)}
            >
              <i className="icon-Print me-2" />
              <span>Print ANC Scheduler</span>
            </Button>
          </div>
        )}
      </div>
      {!isPreviousPregnancyOverview && (
        <div style={{ padding: "25px 40px 15px" }}>
          <AutoComplete
            value={searchQuery}
            onSearch={onSearch}
            options={searchOptions}
            className="autocomplete-custom w-100"
            onSelect={onSelect}
            defaultActiveFirstOption={true}
          >
            <Input
              placeholder="Search & add new test"
              prefix={<i className="icon-search" />}
            />
          </AutoComplete>
        </div>
      )}
      <div className="examinationTableViewContainer">
        <div className="tableWrappwer">
          <table
            className="tableView"
            style={{
              tableLayout: "fixed",
              overflow: "hidden",
            }}
          >
            <thead>{renderTableHeader()}</thead>
            <tbody>{renderTableData()}</tbody>
          </table>
        </div>
      </div>
      <div className="text-greycolor" style={{ padding: "10px 40px 50px" }}>
        View Uploaded Test Reports Here:{" "}
        <span
          className="text-primary"
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={handleDrawerMedicalReport}
        >
          Medical Records
        </span>
      </div>
      {immunisationPopup && (
        <AncImmunisationPopup
          onCancel={() => {
            setImmunisationPopup(null);
            setEditIndex(-1);
            setSearchSelected(null);
          }}
          title={
            immunisationPopup === "delete"
              ? `Remove ${ancSchedulerData?.[activeCategory]?.[editIndex]?.master?.name}`
              : immunisationPopup === "add"
              ? "Add New Test"
              : "Edit Test Details"
          }
          description={`Are you sure you want to remove this "${ancSchedulerData?.[activeCategory]?.[editIndex]?.master?.name}" from the list`}
          popupType={immunisationPopup}
          ancDetails={
            immunisationPopup === "edit"
              ? ancSchedulerData?.[activeCategory]?.[editIndex]
              : { ...searchSelected, weekRange: {} }
          }
          editIndex={editIndex}
          activeCategory={activeCategory}
          ancSchedulerData={ancSchedulerData}
          setActiveCategory={setActiveCategory}
        />
      )}
      {shouldShowPrintPreview && (
        <AncPrintPreview
          ancSchedulerData={ancSchedulerData}
          shouldShowPrintPreview={shouldShowPrintPreview}
          onCancel={() => setShouldShowPrintPreview(false)}
        />
      )}
    </div>
  );
};

export default AncScheduler;
