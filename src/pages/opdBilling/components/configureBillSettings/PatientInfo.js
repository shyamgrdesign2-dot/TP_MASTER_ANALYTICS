import { Button, Col, Row, Switch, Table } from "antd";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { MenuOutlined } from "@ant-design/icons";
import { CSS } from "@dnd-kit/utilities";
import React, { useCallback, useContext, useMemo, useState } from "react";

const PatientInfo = ({ patientInfo, setPrintSettings }) => {
  const [patientInfoShowHide, setPatientInfoShowHide] = useState(false);
  const RowContext = React.createContext({});

  const onPatientInfoClick = useCallback(() => {
    setPatientInfoShowHide(!patientInfoShowHide);
  }, [patientInfoShowHide]);

  const CustomRow = (props) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      setActivatorNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: props["data-row-key"],
    });
    const style = {
      ...props.style,
      transform: CSS.Translate.toString(transform),
      transition,
      ...(isDragging
        ? {
            position: "relative",
            zIndex: 9999,
          }
        : {}),
    };
    const contextValue = useMemo(
      () => ({
        setActivatorNodeRef,
        listeners,
      }),
      [setActivatorNodeRef, listeners]
    );
    return (
      <RowContext.Provider value={contextValue}>
        <tr {...props} ref={setNodeRef} style={style} {...attributes} />
      </RowContext.Provider>
    );
  };

  const DragHandle = () => {
    const { setActivatorNodeRef, listeners } = useContext(RowContext);
    return (
      <MenuOutlined
        ref={setActivatorNodeRef}
        style={{
          touchAction: "none",
          cursor: "move",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
        {...listeners}
      />
    );
  };

  const onChangePatientInfo = (checked, record) => {
    const index = patientInfo.findIndex((e) => e.id == record.id);
    if (index !== -1) {
      setPrintSettings((prev) => {
        return {
          ...prev,
          headerFooter: {
            ...prev?.headerFooter,
            patientInfo: prev?.headerFooter?.patientInfo?.map((info, idx) =>
              idx === index ? { ...info, enabled: checked } : info
            ),
          },
        };
      });
    }
  };

  const onDragEndPatientInfo = ({ active, over }) => {
    if (active.id !== over?.id) {
      setPrintSettings((prev) => {
        const activeIndex = prev.headerFooter.patientInfo.findIndex(
          (i) => i.id === active.id
        );
        const overIndex = prev.headerFooter.patientInfo.findIndex(
          (i) => i.id === over?.id
        );
        return {
          ...prev,
          headerFooter: {
            ...prev?.headerFooter,
            patientInfo: arrayMove(
              prev.headerFooter.patientInfo,
              activeIndex,
              overIndex
            ),
          },
        };
      });
    }
  };

  //Display Patient Info
  const patientInfoTable = [
    {
      key: "sort",
      colSpan: 2,
      width: 50,
      align: "center",
      dataIndex: "sort",
      render: () => <DragHandle />,
    },
    {
      colSpan: 0,
      dataIndex: "title",
      key: "title",
      render: (text, record) => <div>{record.title}</div>,
    },
    {
      dataIndex: "enabled",
      key: "enabled",
      render: (text, record) => (
        <Switch
          defaultChecked
          onChange={(checked) => onChangePatientInfo(checked, record)}
          checked={text}
        />
      ),
    },
  ];

  return (
    <div className="border-bottom pb-3 mb-3">
      <Row
        justify="space-between"
        className="align-items-center form_addnewpatient mb-1"
      >
        <Col lg="18">
          <div className="titleprint">Display Patient Info</div>
        </Col>
        <Col lg="6">
          <Button
            className="btn rounded-10px px-1 border px-3-15"
            style={{
              transform: patientInfoShowHide
                ? "rotate(90deg)"
                : "rotate(-90deg)",
            }}
            onClick={onPatientInfoClick}
          >
            <i className="icon-right"></i>
          </Button>
        </Col>
      </Row>
      <div>Manage your patient information</div>
      {patientInfoShowHide && (
        <div className="mt-4">
          <div className="mt-4">
            <Row
              justify="space-between"
              className="align-items-center form_addnewpatient mb-3"
            >
              <Col lg={24}>
                <DndContext
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={onDragEndPatientInfo}
                >
                  <SortableContext
                    // rowKey array
                    items={patientInfo?.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Table
                      className="customize-table table-display-patient"
                      pagination={false}
                      components={{
                        body: {
                          row: CustomRow,
                        },
                      }}
                      rowKey="id"
                      columns={patientInfoTable}
                      dataSource={patientInfo}
                      showHeader={false}
                    />
                  </SortableContext>
                </DndContext>
              </Col>
            </Row>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientInfo;
