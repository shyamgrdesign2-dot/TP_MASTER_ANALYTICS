import React from "react";
import "./VaccineTable.scss";
import { dateFormatter } from "../../VaccinationHelper";
import moment from "moment";

const VaccineTable = ({ dataSource, columns, isPreview, isOtherVaccines }) => {
  const groupDataByCommonIDs = (data) => {
    const groupedData = [];
    const idSet = new Set();

    data?.forEach((item) => {
      if (!idSet.has(item.tvt_age)) {
        const group = data.filter((d) => d.tvt_age === item.tvt_age);
        groupedData.push(group);
        idSet.add(item.tvt_age);
      }
    });

    return groupedData;
  };

  const renderTableHeader = () => {
    return (
      <tr>
        {columns?.map((header, index) => (
          <th
            key={index}
            className="cell headerCellStyle"
            style={{
              width: `${header.width}`,
            }}
          >
            {header.title}
          </th>
        ))}
      </tr>
    );
  };

  const renderTableData = () => {
    const groupedData = groupDataByCommonIDs(dataSource);

    return groupedData.map((group, groupIndex) => {
      return (
        <React.Fragment key={groupIndex}>
          {group.map((item, itemIndex) => {
          const updatedDueDate = item.tvd_due_date
            ? moment(item.tvd_due_date)
            : null;
          const givenDate = item?.tvp_given_date
            ? moment(item.tvp_given_date)
            : null;
          const overDueForGivenVaccine =
            givenDate &&
            updatedDueDate &&
            givenDate.isAfter(updatedDueDate, "day");
          const overDueForNotGivenVaccine =
            updatedDueDate && updatedDueDate.isBefore(new Date(), "day");
          return (
            <tr key={itemIndex}>
              {itemIndex === 0 && (
                <td className="cell" rowSpan={group.length}>
                  {item.tvt_age}
                </td>
              )}
              <td className="cell">{item.tvac_name}</td>
              <td className="cell">
                {item.tvp_given_date ? item.brandName : ""}
              </td>
              <td className="cell">
                <div className="dateCell">
                  {isOtherVaccines || item?.isOtherVaccines ? item.tvd_due_date ? dateFormatter(new Date(item.tvd_due_date)) : "" : dateFormatter(new Date(item.tvd_due_date)) || item.dueDate}
                  {(overDueForGivenVaccine || overDueForNotGivenVaccine) &&
                  isPreview ? (
                    <span className="overDue">Over Due</span>
                  ) : null}
                </div>
              </td>

              <td className="cell">
                <div className="dateCell">
                  {dateFormatter(new Date(item.tvp_given_date))}
                  {item.tvp_given_date && isPreview ? (
                    <span className="given">Given</span>
                  ) : null}
                </div>
              </td>
              <td className="cell">{item.tvpv_site || ""}</td>
              <td className="cell">{item.tvp_remarks || item.tvd_remarks}</td>
            </tr>
          );
          })}
        </React.Fragment>
      );
    });
  };

  return (
    <div>
      <table className="table">
        <thead>{renderTableHeader()}</thead>
        <tbody>{renderTableData()}</tbody>
      </table>
    </div>
  );
};

export default VaccineTable;
