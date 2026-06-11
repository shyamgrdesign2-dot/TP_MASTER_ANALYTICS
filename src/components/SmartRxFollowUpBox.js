import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { Input, Button, Drawer, Tabs, Select, Spin, Popover, Row, Col, DatePicker, Tooltip } from 'antd';
import { LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';
import moment from "moment";
import { isMobile } from 'react-device-detect';

import CashManagerContext from '../context/CashManagerContext';
import { errorMessage, getFormattedDate, onlyNumberFormat, capitalizeAfterSentence, removeBeforeWhiteSpace } from "../utils/utils";
import dayjs from "dayjs";
import { ASSETS } from "../assets";
const followUp = ASSETS.images.followup;

const dateFormat = 'YYYY-MM-DD'

function SmartRxFollowUpBox() {
    const {
        // selectedAdviceList,
        templates,
        loading,
    } = useSelector((state) => state.followUp);
    const dispatch = useDispatch();

    const { followUpDate, setFollowUpDate} = useContext(CashManagerContext);
    const [followUpInput, setFollowUpInput] = useState('');
    const [selectedDate, setSelectedDate] = useState(null); // New state for DatePicker value
    const { selectedSymptomsCollector } =
    useSelector((state) => state.ddx);

    const [dateOptions, setDateOptions] = useState([
        { value: '2', unit: 'day', label: "2 Days" },
        { value: '2', unit: 'week', label: "2 Weeks" },
        { value: '2', unit: 'month', label: "2 Months" },
    ]);

    const onChangeFollowUp = useCallback(
        (e) => {
            const updateQuery = onlyNumberFormat(e.target.value);
            setFollowUpInput(updateQuery)
            setFollowUpDate(null)
            setSelectedDate(null) // Clear selected date when input is cleared
            if (updateQuery.length > 0) {
                const options = [
                    { value: `${updateQuery}`, unit: 'day', label: `${updateQuery} ${updateQuery <= 1 ? 'Day' : 'Days'}` },
                    { value: `${updateQuery}`, unit: 'week', label: `${updateQuery} ${updateQuery <= 1 ? 'Week' : 'Weeks'}` },
                    { value: `${updateQuery}`, unit: 'month', label: `${updateQuery} ${updateQuery <= 1 ? 'Month' : 'Months'}` },
                ];
                setDateOptions(options);
            } else {
                const options = [
                    { value: '2', unit: 'day', label: "2 Days" },
                    { value: '2', unit: 'week', label: "2 Weeks" },
                    { value: '2', unit: 'month', label: "2 Months" },
                ];
                setDateOptions(options);
            }
        },
        [followUpInput, dateOptions]
    );

    const disabledDate = (current) => {
        // Can not select days before today and today
        return current && current < moment().startOf('day');
    };

    const onDateChanged = (date, dateString) => {
        if (dateString) {
            const dateB = moment(dateString);
            const dateC = moment().format(dateFormat);

            console.log(`Difference is ${dateB.diff(dateC, 'days')} day(s)`);
            console.log(`Difference is ${dateB.diff(dateC, 'weeks')} week(s)`);
            console.log(`Difference is ${dateB.diff(dateC, 'months')} month(s)`);

            const days = dateB.diff(dateC, 'days');
            const weeks = dateB.diff(dateC, 'weeks');
            const months = dateB.diff(dateC, 'months');

            // const days = moment.duration(dateB.diff(dateC)).asDays();
            // const weeks = moment.duration(dateB.diff(dateC)).asWeeks();
            // const months = moment.duration(dateB.diff(dateC)).asMonths();

            if (months > 0) {
                setFollowUpInput(`${months} ${months <= 1 ? 'Month' : 'Months'}`)
            } else if (weeks > 0) {
                setFollowUpInput(`${weeks} ${weeks <= 1 ? 'Week' : 'Weeks'}`)
            } else {
                setFollowUpInput(`${days} ${days <= 1 ? 'Day' : 'Days'}`)
            }
            setFollowUpDate(getFormattedDate(moment(moment().format(dateFormat)).add(days, 'day').format(dateFormat)))
            setSelectedDate(date) // Set the selected date for DatePicker
            setDateOptions([]);
        }
    };

    const onOptionPress = (e) => {
        window.Moengage.track_event("followup_chip_select", {
            "value": e.label
        });
        setDateOptions([]);
        setFollowUpInput(e.label)
        const calculatedDate = moment(moment().format(dateFormat)).add(parseInt(e.value), e.unit);
        setFollowUpDate(getFormattedDate(calculatedDate.format(dateFormat)))
        setSelectedDate(calculatedDate.toDate()) // Set the selected date for DatePicker
    };

    return (
        <>
            <div style={{padding: "6px"}}>
                <div className="d-flex align-items-center mb-14">
                    <img className='me-3' src={followUp} alt="Symptoms" />
                    <div className="title-common">Follow-up</div>
                </div>
                <div className="d-flex calender-merge-input mt-3">
                    <Input className="w-100 calnder-input1" placeholder="e.g. 3 Days" value={followUpInput} inputMode="numeric" onChange={onChangeFollowUp} allowClear />
                    <DatePicker 
                        inputReadOnly 
                        disabledDate={disabledDate} 
                        onChange={onDateChanged} 
                        value={selectedDate ? dayjs(selectedDate) : null}
                    />
                </div>
                {followUpDate && (
                    <div className="title fontroboto mt-2">
                        {moment(followUpDate).format('dddd, Do MMMM YYYY')}
                    </div>
                )}
                <div className="d-flex pt-2 date-button">
                    {dateOptions.length > 0 &&
                        dateOptions.map((item, i) => {
                            return (
                                <Button key={i} type="text" className="d-felx align-items-center btn btn-primary2 btn-fw-bold fs-12" onClick={() => onOptionPress(item)}>{item.label}</Button>
                            )
                        })}
                </div>  
            </div>
        </>
    );
}

export default React.memo(SmartRxFollowUpBox);
