import { Button, Checkbox, Modal } from "antd";
import { AncPrintPreviewColumns } from "../../utils/constants";
import "./AncPrintPreview.scss";
import React, { useEffect, useRef, useState } from "react";
import { handlePrintClick } from "../../../../utils/utils";
import { useReactToPrint } from "react-to-print";
import FullPageLoader from "../../../vaccination/components/Loader";
import AncSchedulerChart from "../ancSchedulerChart/AncSchedulerChart";
import moment from "moment";

const AncPrintPreview = ({
  ancSchedulerData,
  shouldShowPrintPreview,
  onCancel,
}) => {
  const [tabLoader, setTabLoader] = useState(false);
  const [selectedListToPrint, setSelectedListToPrint] = useState([]);
  const printableRef = useRef(null);

  useEffect(() => {
    const updatedListToPrint = ancSchedulerData.flatMap((trimesterList) =>
      trimesterList
        ?.filter((item) => item?.enablePrint === true)
        .map((item) => item.masterId)
    );
    setSelectedListToPrint(updatedListToPrint);
  }, []);

  const handlePrintWeb = useReactToPrint({
    content: () => printableRef.current,
  });

  const handlePrint = () => {
    handlePrintClick(
      printableRef.current,
      setTabLoader,
      handlePrintWeb,
      "vaccinationChart"
    );
  };

  const selectAllHandler = () => {
    const totalRecords = ancSchedulerData.reduce((total, subArray) => {
      return total + (subArray?.length || 0);
    }, 0);

    if (selectedListToPrint?.length !== totalRecords) {
      const updatedListToPrint = ancSchedulerData.flatMap((trimesterList) =>
        trimesterList?.map((item) => item?.masterId)
      );
      setSelectedListToPrint(updatedListToPrint);
    } else {
      setSelectedListToPrint([]);
    }
  };

  const renderTableHeader = () => {
    return (
      <tr style={{ backgroundColor: "#F1F1F5" }}>
        {AncPrintPreviewColumns?.map((header, index) => (
          <th
            key={index}
            className="ancPrintPreviewTcell theaderCellStyle"
            style={{
              width: header.width,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {header.key === "enablePrint" ? (
              <>
                <Checkbox onClick={selectAllHandler} className="me-2" />
                {header.title}
              </>
            ) : (
              header.title
            )}
          </th>
        ))}
      </tr>
    );
  };

  const renderTableData = () => {
    const selectToPrint = (masterId) => {
      setSelectedListToPrint((prev) => [...prev, masterId]);
    };
    return ancSchedulerData?.map((trimesterList, trimesterIndex) => {
      return (
        <React.Fragment key={trimesterIndex}>
          <tr className="ancPrintPreviewTcell theaderCellStyle">
            <td
              colSpan={6}
              style={{ paddingLeft: 20, fontSize: 14, fontWeight: 600 }}
            >
              {trimesterIndex === 0
                ? "First"
                : trimesterIndex === 1
                ? "Second"
                : "Third"}{" "}
              Trimester
            </td>
          </tr>
          {trimesterList?.map((item, index) => {
            const { masterId, master, weekRange, status, dueDate, notes } =
              item;
            return (
              <tr key={index}>
                <td className="ancPrintPreviewTcell">{master?.name}</td>
                <td className="ancPrintPreviewTcell weekRange">
                  {`${weekRange?.start} - ${weekRange?.end}`}
                </td>
                <td className="ancPrintPreviewTcell">
                  {dueDate ? moment(dueDate).format("DD/MM/YYYY") : ""}
                </td>
                <td className="ancPrintPreviewTcell">{status}</td>

                <td className="ancPrintPreviewTcell">{notes}</td>
                <td className="ancPrintPreviewTcell" ancPrintPreviewTcell>
                  <Checkbox
                    checked={selectedListToPrint?.includes(item?.masterId)}
                    onClick={() => selectToPrint(masterId)}
                  />
                </td>
              </tr>
            );
          })}
        </React.Fragment>
      );
    });
  };

  return (
    <div>
      <Modal
        title={
          <div className="d-flex justify-content-between">
            <span style={{ fontWeight: 500, fontSize: 20 }}>
              Print ANC Scheduler
            </span>
            <div className="d-flex gap-3">
              <i
                className="icon-Cross"
                style={{ cursor: "pointer" }}
                onClick={onCancel}
              ></i>
            </div>
          </div>
        }
        footer={
          <div className="mt-4">
            <div className="d-flex align-items-center mt-2 justify-content-end">
              <div
                onClick={onCancel}
                className="me-4 text-decoration-underline btn p-0 text-main"
              >
                Cancel
              </div>
              <Button
                className="lh-lg btn btn-primary3 btn-41 px-4 d-flex align-items-center"
                icon={<i className="icon-Print" />}
                onClick={handlePrint}
                disabled={selectedListToPrint?.length === 0}
              >
                <span>Print</span>
              </Button>
            </div>
          </div>
        }
        centered
        open={shouldShowPrintPreview}
        closeIcon={false}
        width={1114}
        height={708}
        onCancel={onCancel}
        show={true}
        onHide={onCancel}
      >
        <div
          className="tableContainer"
          style={{ height: "75vh", overflowY: "auto" }}
        >
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
        </div>
      </Modal>
      <div style={{ display: "none" }}>
        <div ref={printableRef}>
          <AncSchedulerChart
            selectedPrintData={ancSchedulerData.flatMap((trimesterList) =>
              trimesterList?.filter((item) =>
                selectedListToPrint?.includes(item.masterId)
              )
            )}
          />
        </div>
      </div>
      {tabLoader && <FullPageLoader />}
    </div>
  );
};

export default AncPrintPreview;
