import { Button, Tooltip } from "antd";
import "./../pregnancyHistory/PregnancyHistory.scss";

import "./Examination.scss";
import moment from "moment";
import { useSelector } from "react-redux";
import { ExaminationColumns } from "../../utils/constants";
import ReadMore from "../../../../common/ReadMore";
import { useState } from "react";
import { ASSETS } from "../../../../assets";
const examination = ASSETS.images.obsExamination;

const Examination = ({
  examinationHistory,
  handleExaminationDrawer,
  handlePastPregnancyDrawer,
  setEditIndex,
  bottomRef,
  isPreviousPregnancyOverview,
}) => {
  const [open, setOpen] = useState(false);
  const [openTooltipIndex, setOpenTooltipIndex] = useState(null);
  const tableColumns = isPreviousPregnancyOverview
    ? ExaminationColumns?.slice(0, -1)
    : ExaminationColumns;
  const renderTableHeader = () => {
    return (
      <tr>
        {tableColumns?.map((header, index) => (
          <th
            key={index}
            className="obstetricTcell theaderCellStyle"
            style={{
              width: header.width,
            }}
          >
            {header.title}
          </th>
        ))}
      </tr>
    );
  };

  const renderTableData = () => {
    const onEdit = (i) => {
      setEditIndex(i);
    };
    return examinationHistory.toReversed().map((item, i) => {
      const {
        pallor,
        oedema,
        mothersBMI,
        systolic,
        diastolic,
        heightOfFundus,
        heightOfFundusUnit,
        presentation = "-",
        liquor,
        foetalHeartRate,
        notes = "-",
        mothersHeight,
        mothersWeight,
      } = item;
      const getBMI = () => {
        const measurements = [
          { key: "Mother's Weight: ", value: `${mothersWeight} kg` },
          { key: "Mother's Height: ", value: `${mothersHeight} cm` },
          { key: "BMI: ", value: `${mothersBMI} kg/m²` },
        ];
        return (
          <div>
            {"BMI: "}
            <Tooltip
              open={openTooltipIndex === i}
              onOpenChange={(visible) => {
                setOpenTooltipIndex(visible ? i : null);
              }}
              overlayInnerStyle={{
                backgroundColor: "white",
                color: "black",
                boxShadow:
                  "0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08)",
                padding: "12px",
                borderRadius: 16,
              }}
              overlayStyle={{
                "--antd-arrow-background-color": "white",
              }}
              title={
                <div style={{ width: 218, padding: 12 }}>
                  <div style={{ marginBottom: "8px" }}>
                    {measurements?.map((item) => {
                      return (
                        <div className="d-flex gap-2 mb-2">
                          <div style={{ fontSize: 14 }}>{item.key}</div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {item.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    type="primary"
                    className="gotItBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenTooltipIndex(null);
                    }}
                  >
                    Got it
                  </Button>
                </div>
              }
            >
              <span className="text-primary text-decoration-underline cursor-pointer">
                {mothersBMI} kg/m²
              </span>
            </Tooltip>
          </div>
        );
      };
      return (
        <tr key={i}>
          <td className="obstetricTcell">
            Visit {i + 1}
            <div className="visitStyle">
              {item.date ? moment(item.date).format("DD MMM YYYY") : ""}
            </div>
          </td>
          <td className="obstetricTcell">
            {typeof pallor === "boolean" ? (pallor ? "Yes" : "No") : "-"}
          </td>
          <td className="obstetricTcell">
            {typeof oedema === "boolean" ? (oedema ? "Yes" : "No") : "-"}
          </td>
          <td className="obstetricTcell">
            {mothersBMI ? getBMI() : ""}
            {mothersWeight && !mothersBMI ? `Weight: ${mothersWeight} kg` : ""}
            {mothersHeight && !mothersBMI ? `Height: ${mothersHeight} cm` : ""}
            {!mothersBMI && !mothersWeight && !mothersHeight ? "-" : ""}
          </td>
          <td className="obstetricTcell">
            {systolic && diastolic ? systolic + "/" + diastolic + " mmHg" : "-"}
          </td>
          <td className="obstetricTcell">
            {heightOfFundus
              ? heightOfFundus + " " + heightOfFundusUnit ?? ""
              : "-"}
          </td>
          <td className="obstetricTcell">{presentation}</td>
          <td className="obstetricTcell">{liquor || "-"}</td>
          <td className="obstetricTcell">
            {foetalHeartRate ? foetalHeartRate + " BPM" : "-"}
          </td>
          <td className="obstetricTcell">
            <ReadMore text={notes || "-"} textLimit={70} />
          </td>
          {!isPreviousPregnancyOverview && (
            <td className="obstetricTcell">
              <div className="editIcon" onClick={() => onEdit(i)}>
                <i className={"icon-Edit me-1 fs-5"} />
                <span className="editText">Edit</span>
              </div>
            </td>
          )}
        </tr>
      );
    });
  };

  return (
    <div>
      {examinationHistory?.length ? (
        <>
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
          {!isPreviousPregnancyOverview ? (
            <div className="anotherVisit">
              <Button
                type="button"
                className="btn-41 btn ant-btn-text btn-input anotherVisitBtn"
                onClick={handleExaminationDrawer}
                ref={bottomRef}
              >
                <i className="icon-Add" />
                <span>Add another visit</span>
              </Button>
              or
              <Button
                type="button"
                className="btn-41 btn ant-btn-tex anotherVisitBtn completePregnancyBtn"
                onClick={handlePastPregnancyDrawer}
              >
                <span className="completePregnancy">Complete Pregnancy</span>
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="emptyDataContainer">
          <img src={examination} alt="examination" />
          <div className="shortDescription">
            Add details to track every details such as Fundus height, Fetus
            weight, Presentation and Fetus heart rate.
          </div>
          <Button
            type="button"
            className="btn-41 btn ant-btn-text btn-input d-flex align-items-center justify-content-between"
            style={{
              width: "180px",
            }}
            onClick={handleExaminationDrawer}
          >
            <i className="icon-Add" />
            <span>Add Examination</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Examination;
