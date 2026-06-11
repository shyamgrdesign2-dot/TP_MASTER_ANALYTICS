import moment from "moment";

const AncSchedulerTable = ({ dataSource, columns }) => {
  const renderTableHeader = () => {
    return (
      <tr>
        {columns?.map((header, index) => (
          <th
            key={index}
            className="cell headerCellStyle text-welcome"
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
    return dataSource.map((item, i) => (
      <tr key={i}>
        <td className="tcell text-welcome">{item?.master?.name}</td>
        <td className="tcell text-welcome">{item.dueDate ? moment(item.dueDate).format("DD/MM/YYYY") : "-"}</td>
        <td className="tcell text-welcome">{item.status ?? "-"}</td>
        <td className="tcell text-welcome">{item.notes ?? "-"}</td>
      </tr>
    ));
  };

  return (
    <div className="tableViewContainer tableViewContainerForPrint">
      <table className="tableView">
        <thead>{renderTableHeader()}</thead>
        <tbody>{renderTableData()}</tbody>
      </table>
    </div>
  );
};

export default AncSchedulerTable;
