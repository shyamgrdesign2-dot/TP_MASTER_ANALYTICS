import React, { useContext, useMemo, useCallback } from 'react';
import { Button, Table, Switch, Input } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { MenuOutlined } from '@ant-design/icons';
import { CSS } from '@dnd-kit/utilities';

import DoctorWebsiteSettingsContext from '../../context/DoctorWebsiteSettingsContext';
import { blockedEmoji, removeBeforeWhiteSpace } from '../../utils/utils';

const RowContext = React.createContext({});
const DragHandle = () => {
    const { setActivatorNodeRef, listeners } = useContext(RowContext);

    return (
        <MenuOutlined
            ref={setActivatorNodeRef}
            style={{
                touchAction: 'none',
                cursor: 'move',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
            {...listeners}
        />
    );
};
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
        id: props['data-row-key'],
    });
    const style = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging
            ? {
                position: 'relative',
                zIndex: 9999,
            }
            : {}),
    };
    const contextValue = useMemo(
        () => ({
            setActivatorNodeRef,
            listeners,
        }),
        [setActivatorNodeRef, listeners],
    );
    return (
        <RowContext.Provider value={contextValue}>
            <tr {...props} ref={setNodeRef} style={style} {...attributes} />
        </RowContext.Provider>
    );
};

function DWServices() {

    const { services, setServices } = useContext(DoctorWebsiteSettingsContext);

    const onChangeInput = useCallback(
        (e, key, i) => {
            services[i][key] = removeBeforeWhiteSpace(blockedEmoji(e.target.value));
            setServices((prev) => { return [...prev] });
        },
        [services]
    );

    const onRemoveRow = (index) => {
        services.splice(index, 1);
        setServices((prev) => { return [...prev] });
    };

    const servicesTable = [
        {
            key: 'sort',
            colSpan: 2,
            width: 50,
            align: 'center',
            dataIndex: 'sort',
            render: () => <DragHandle />
        },
        {
            colSpan: 0,
            dataIndex: 'title',
            key: 'title',
            render: (text, record, i) =>
                <Input placeholder="Write your services"
                    className="text-capitalize rounded-10px h-38"
                    value={text}
                    onChange={(e) => onChangeInput(e, 'title', i)} />
        },
        {
            dataIndex: 'enable',
            key: 'enable',
            render: (text, record, i) => <i className="icon-delete" onClick={() => onRemoveRow(i)}></i>
        },
    ];

    const onDragEndMembership = ({ active, over }) => {
        if (active.id !== over?.id) {
            setServices((previous) => {
                const activeIndex = previous.findIndex((i) => i.unique_id === active.id);
                const overIndex = previous.findIndex((i) => i.unique_id === over?.id);
                return arrayMove(previous, activeIndex, overIndex);
            });
        }
    };

    const addServicesClick = useCallback(
        () => {
            services.push({
                title: '',
                unique_id: uuidv4()
            })
            setServices((prev) => { return [...prev] });
        },
        [services]
    );

    return (
        <div className="bg-white overflow-auto" style={{ height: 'calc(100vh - 120px)' }}>
            <div className='p-20'>
                <div className="text-greycolor fontroboto"> Include the services you provide to your patients. You can add up to 8 services.</div>

                {/* Use D&D Table Design here  */}
                <div className="mt-4">
                    <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEndMembership}>
                        <SortableContext
                            // rowKey array
                            items={services.map((i) => i.unique_id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <Table
                                className='customize-table table-display-patient'
                                pagination={false}
                                components={{
                                    body: {
                                        row: CustomRow,
                                    },
                                }}
                                rowKey="unique_id"
                                columns={servicesTable}
                                dataSource={services}
                                showHeader={false}
                            />
                        </SortableContext>
                    </DndContext>
                </div>
                {services?.length < 8 && (
                    <Button className='btn btn-input w-100 btn-41 d-flex align-items-center justify-content-center mt-3' onClick={addServicesClick} ><i className='icon-Add fs-18 me-2'></i>Add Service</Button>
                )}
            </div>
        </div>
    );
}

export default React.memo(DWServices);
