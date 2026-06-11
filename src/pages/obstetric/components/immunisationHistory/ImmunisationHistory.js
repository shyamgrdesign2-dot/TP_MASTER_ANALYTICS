import { ImmunisationColumns } from "../../utils/constants";
import "./../pregnancyHistory/PregnancyHistory.scss";
import "./../examination/Examination.scss";
import moment from "moment";
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
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { removeBeforeWhiteSpace } from "../../../../utils/utils";
import { fetchSearchImmunisation } from "../../service";
import {
  addObstetricDetails,
  obstetricDetailsUpdated,
  patientDiagnosisUpdated,
} from "../../../../redux/obstetricSlice";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import AncImmunisationPopup from "../ancImmunisationPopup/AncImmunisationPopup";
import {
  mergeDefaultAndDoctorList,
  updateEnablePrint,
} from "../../utils/helper";
import { isBrowser } from "react-device-detect";

const ImmunisationHistory = ({
  immunisationHistoryData = [],
  isPreviousPregnancyOverview,
}) => {
  const dispatch = useDispatch();
  const { state } = useLocation();
  const { patient_data } = state;
  const { userId } = useSelector((state) => state.doctors);
  const { obstetricDetails, defaultImmunisation, immunisationDoctorList } =
    useSelector((state) => state.obstetric);
  const [immunisationHistory, setImmunisationHistory] = useState([]);
  const [immunisationPopup, setImmunisationPopup] = useState("");
  const [editIndex, setEditIndex] = useState(-1);
  const [searchSelected, setSearchSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);

  useEffect(() => {
    const updatedImmunisationHistory = updateEnablePrint(
      immunisationHistoryData
    );
    setImmunisationHistory(updatedImmunisationHistory);
  }, [immunisationHistoryData]);

  useEffect(() => {
    if (!isPreviousPregnancyOverview) {
      const newImmunisationHistory = mergeDefaultAndDoctorList(
        immunisationHistoryData,
        defaultImmunisation,
        immunisationDoctorList,
        userId
      );
      const payload = {
        ...obstetricDetails,
        currentPregnancy: {
          ...obstetricDetails?.currentPregnancy,
          immunisationHistory: newImmunisationHistory,
        },
      };
      dispatch(addObstetricDetails(payload));
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

  const disabledDate = (current) => {
    return current && current >= moment().add(1, "days").startOf("day");
  };

  const getSearchOptions = async () => {
    const searchOptionsRes = await fetchSearchImmunisation(
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
              <i className="icon-Add mx-1 text-primary fs-6" />{" "}
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

  const renderTableHeader = () => {
    const tableColumns = isPreviousPregnancyOverview
      ? ImmunisationColumns?.slice(0, -2)
      : ImmunisationColumns;
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
                    Enable the toggle to show vaccine details in the Rx Print
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
      const updatedData = [...immunisationHistory];
      updatedData[index] = { ...updatedData[index], [key]: value };
      updatedData[index].modifiedAt = new Date().toISOString();
      updatedData[index].modifiedBy = userId;
      if (key !== "enablePrint" && !isOnBlur) {
        updatedData[index] = { ...updatedData[index], enablePrint: true };
      }
      if (key === "givenDate" && value) {
        updatedData[index] = { ...updatedData[index], status: "Given" };
      }
      const payload = {
        ...obstetricDetails,
        currentPregnancy: {
          ...obstetricDetails?.currentPregnancy,
          immunisationHistory: updatedData,
        },
      };
      setImmunisationHistory(updatedData);
      dispatch(addObstetricDetails(payload));
      dispatch(patientDiagnosisUpdated());
      dispatch(obstetricDetailsUpdated());
    };

    return immunisationHistory.map((item, i) => {
      const { master, status, givenDate, notes, enablePrint } = item;
      return (
        <tr key={i}>
          <td className="obstetricTcell">
            {master?.name}
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
            <Select
              style={{ width: 136, height: 41 }}
              onChange={(value) => handleImmunisationChange("status", i, value)}
              options={[
                { value: "Due", label: "Due" },
                { value: "Given", label: "Given" },
              ]}
              placeholder="Select"
              className={`custom-immunisation-select ${
                status === "Given" ? "custom-immunisation-given-select" : ""
              }`}
              value={status || "Due"}
              allowClear={false}
              disabled={isPreviousPregnancyOverview}
            />
          </td>
          <td className="obstetricTcell">
            <DatePicker
              key={"date"}
              onChange={(date) => {
                const formattedDate = date?.toISOString();
                handleImmunisationChange("givenDate", i, formattedDate);
              }}
              disabledDate={disabledDate}
              value={givenDate ? dayjs(moment(givenDate)) : ""}
              style={{ width: "136px", height: "41px" }}
              format={{
                format: "DD-MM-YYYY",
                type: "mask",
              }}
              disabled={isPreviousPregnancyOverview}
              inputReadOnly={!isBrowser}
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
              styles={{ border: "none" }}
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
                    title={
                      <div>Default Immunisation vaccine cannot be deleted</div>
                    }
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
        className="examinationTableViewContainer"
        style={{ paddingBottom: 40 }}
      >
        {!isPreviousPregnancyOverview && (
          <div style={{ paddingBottom: 30 }}>
            <AutoComplete
              value={searchQuery}
              onSearch={onSearch}
              options={searchOptions}
              className="autocomplete-custom w-100"
              onSelect={onSelect}
              defaultActiveFirstOption={true}
            >
              <Input
                placeholder="Search & add new vaccine"
                prefix={<i className="icon-search" />}
              />
            </AutoComplete>
          </div>
        )}
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
      {immunisationPopup && (
        <AncImmunisationPopup
          onCancel={() => {
            setImmunisationPopup(null);
            setEditIndex(-1);
            setSearchSelected(null);
          }}
          title={
            immunisationPopup === "delete"
              ? `Remove ${immunisationHistory?.[editIndex]?.master?.name} Vaccine`
              : immunisationPopup === "add"
              ? "Add New Vaccine"
              : "Edit Custom Vaccine"
          }
          description={`Are you sure you want to remove this "${immunisationHistory?.[editIndex]?.master?.name}" from the list`}
          popupType={immunisationPopup}
          ancDetails={
            immunisationPopup === "edit"
              ? immunisationHistory?.[editIndex]
              : searchSelected
          }
          editIndex={editIndex}
          ancSchedulerData={immunisationHistory}
        />
      )}
    </div>
  );
};

export default ImmunisationHistory;
