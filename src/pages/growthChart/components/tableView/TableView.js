import React from "react";
import { Space } from "antd";
import "./tableView.scss";
import { EditOutlined } from "@ant-design/icons";
import moment from "moment";

const TableView = ({ dataSource, onEdit }) => {
  const columns = [
    {
      title: "Parameters",
      dataIndex: "tcbc_created_date",
      key: "tcbc_created_date",
    },
    {
      title: "Height",
      dataIndex: "height",
      key: "height",
    },
    {
      title: "Weight",
      dataIndex: "weight",
      key: "weight",
    },
    {
      title: "BMI",
      dataIndex: "bmi",
      key: "bmi",
    },
    {
      title: "OFC",
      dataIndex: "ofc",
      key: "ofc",
    },
  ];
  const renderTableHeader = () => {
    return (
      <tr>
        {columns?.map((header, index) => (
          <th
            key={index}
            className="tcell theaderCellStyle"
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
        <td className="tcell">
          <Space>
            {item.tcbc_created_date
              ? moment(item.tcbc_created_date).format("DD MMM YYYY")
              : ""}
            {onEdit && (
              <EditOutlined
                className="custom-icon"
                onClick={() => onEdit(item)}
              />
            )}
          </Space>
        </td>
        <td className="tcell">{item.height}</td>
        <td className="tcell">{item.weight}</td>
        <td className="tcell">{item.bmi}</td>
        <td className="tcell">{item.ofc}</td>
      </tr>
    ));
  };

  return (
    <div
      className={`tableViewContainer ${
        onEdit ? "" : "tableViewContainerForPrint"
      }`}
    >
      <table className="tableView">
        <thead>{renderTableHeader()}</thead>
        <tbody>{renderTableData()}</tbody>
      </table>
    </div>
  );
};

export default TableView;
