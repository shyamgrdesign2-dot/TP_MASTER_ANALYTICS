import React, { useState, useEffect, useCallback } from "react";
import { Tabs, Table, Drawer, DatePicker, Checkbox, Dropdown, Input } from "antd";
import Button from "react-bootstrap/Button";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import dayjs from 'dayjs';

import { useSelector, useDispatch } from "react-redux";
import { paymentHistory, userCampaign, userCampaignDelete, userCampaignDetails, userCount, userCredit } from "../redux/bulkMessagesSlice";

import LoopingVideo from "../components/common/LoopingVideo";
import "../components/bulk_messages/messages.scss";
import "../components/common/dateRangePill.scss";

import DetailedView from "../components/bulk_messages/DetailedView";
import CommonModal from "../common/CommonModal";

import { TAB_CAMPAIGN, TAB_DRAFT, TAB_PURCHASE } from "../utils/constants";
import { errorMessage, getClinicCity, removeBeforeWhiteSpace } from "../utils/utils";
import AvailableCredits from "../components/bulk_messages/AvailableCredits";
import { upsertDoctorSettingFlag } from "../redux/doctorsSlice";
import { ASSETS } from "../assets";
const {
  edit: editIcon,
  emptyCampaignHistory: emptyCampaign,
  emptyPurchaseHistory: emptyPurchase,
  newGif_3: newGifWebm,
  newGif_2: newGifMp4,
  messagesVideo,
  received: RecievedImg,
  send: SendImg,
  mailMessage,
  textMessage,
  mailReciept,
} = ASSETS.images;

const { RangePicker } = DatePicker;

const dateFormat = 'YYYY-MM-DD'
const showDateFormat = 'DD MMM YYYY'

function MessagesData(props) {

    const { appointmentAgentsData } = props;

    const { tabCountObj, userCampaignList, userPurchaseList, campaignDetails, loading, errorObj } = useSelector((state) => state.bulkMessages);
    const { profile } = useSelector((state) => state.doctors);
    const dispatch = useDispatch();

    const [checked, setChecked] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tabItems, setTabItems] = useState([])
    const [selectedTab, setSelectedTab] = useState(TAB_CAMPAIGN);
    const [dateRange, setDateRange] = useState({
        startDate: moment().format(dateFormat),
        endDate: moment().format(dateFormat),
    });
    const [dateStatus, setDateStatus] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [purchaseList, setPurchaseList] = useState([]);
    const [campaignList, setCampaignList] = useState([]);
    const [messageDetailed, setMessageDetailed] = useState(false);
    const [availableCredit, setAvailableCredit] = useState(false);
    const [pickerModal, setPickerModal] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        dispatch(userCredit());
        if (profile?.userSettingFlag?.find(e => e?.type === 'bulkSms')?.status !== 1) {
            showHideModal()
        }
        const clinic_city = getClinicCity(profile?.hospital_data);
        window.Moengage.track_event("TP_Messages_Button", {
            "Doctor_specialty": profile?.dp_name,
            "Doctor_unique_id": profile?.doctor_unique_id,
            clinic_city,
            "Doctor_Name": profile?.um_name,
            "Doctor_mobile_No": profile?.um_contact,
        });
    }, []);

    const showHideModal = useCallback(() => {
        setIsModalOpen(!isModalOpen);
    }, [isModalOpen]);

    const onCheckboxChange = (e) => {
        setChecked(e.target.checked);
    };

    const gotItPress = () => {
        checked && dispatch(upsertDoctorSettingFlag({ type: 'bulkSms', status: 1 }))
        showHideModal()
    }

    useEffect(() => {
        const timeOutId = setTimeout(() => {
            var sendData = {
                draft: selectedTab
            }
            if (dateRange.startDate != dateRange.endDate) {
                sendData['start_date'] = dateRange.startDate;
                sendData['end_date'] = dateRange.endDate;
            }
            // console.log(sendData)
            if (selectedTab === TAB_PURCHASE) {
                dispatch(paymentHistory(sendData));
            } else {
                !pickerModal && dispatch(userCampaign(sendData));
            }
            dispatch(userCount(sendData))
        }, 500);
        return () => {
            clearTimeout(timeOutId);
        };
    }, [selectedTab, pickerModal]);

    useEffect(() => {
        setTabItems([
            {
                key: TAB_CAMPAIGN,
                label: (
                    <div className="d-flex align-items-center">
                        <img width={17} height={17} className="me-2" src={mailMessage} alt="" />
                        {`Campaign History ${tabCountObj ? '(' + tabCountObj?.count_live + ')' : ''}`}
                    </div>
                ),
            },
            {
                key: TAB_DRAFT,
                label: (
                    <div className="d-flex align-items-center">
                        <img width={17} height={17} className="me-2" src={textMessage} alt="" />
                        {`Draft Campigns ${tabCountObj ? '(' + tabCountObj?.count_draft + ')' : ''}`}
                    </div>
                ),
            },
            {
                key: TAB_PURCHASE,
                label: (
                    <div className="d-flex align-items-center">
                        <img width={17} height={17} className="me-2" src={mailReciept} alt="" />
                        {`Purchase History ${tabCountObj ? '(' + tabCountObj?.count_paymentHistory + ')' : ''}`}
                    </div>
                ),
            },
        ]);
    }, [tabCountObj]);

    // Second Tab
    useEffect(() => {
        if (searchQuery) {
            const searchTimeOutId = setTimeout(() => {
                if (selectedTab === TAB_PURCHASE) {
                    const newData = userPurchaseList.filter((item) => {
                        return item.payment_id.toLowerCase().includes(searchQuery.toLowerCase())
                    });
                    setPurchaseList(newData)
                } else {
                    const newData = userCampaignList.filter((item) => {
                        return item.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())
                    });
                    setCampaignList(newData)
                }
            }, 500);
            return () => {
                clearTimeout(searchTimeOutId);
            };
        } else {
            if (selectedTab === TAB_PURCHASE) {
                setPurchaseList(userPurchaseList)
            } else {
                setCampaignList(userCampaignList)
            }
        }
    }, [userCampaignList, userPurchaseList, searchQuery]);

    const onSearch = useCallback(
        (e) => {
            const updateQuery = removeBeforeWhiteSpace(e.target.value)
            setSearchQuery(updateQuery)
        },
        [searchQuery]
    );

    const onChange = (key) => {
        setSelectedTab(key);
        setDateRange({
            startDate: moment().format(dateFormat),
            endDate: moment().format(dateFormat),
        });
        setDateStatus(1);
    }

    const handlePickerModal = useCallback(
        () => {
            setPickerModal(!pickerModal);
        },
        [pickerModal]
    );

    const disabledDate = (current) => {
        return current && current > dayjs().endOf("day");
    };

    const rangePresets = [
        {
            label: <div className={`${dateStatus === 1 ? 'active' : ''}`}>Till date</div>,
            value: [dayjs(), dayjs().endOf('day')],
        },
        {
            label: <div className={`${dateStatus === 2 ? 'active' : ''}`}>Last week</div>,
            value: [dayjs().add(-7, 'd'), dayjs()],
        },
        {
            label: <div className={`${dateStatus === 3 ? 'active' : ''}`}>Last month</div>,
            value: [dayjs().add(-1, 'M'), dayjs()],
        },
        {
            label: <div className={`${dateStatus === 4 ? 'active' : ''}`}>Last 3 month</div>,
            value: [dayjs().add(-3, 'M'), dayjs()],
        },
        {
            label: <div className={`${dateStatus === 5 ? 'active' : ''}`}>Last 6 month</div>,
            value: [dayjs().add(-6, 'M'), dayjs()],
        },
        {
            label: <div className={`${dateStatus === 6 ? 'active' : ''}`}>Last 1 year</div>,
            value: [dayjs().add(-1, 'y'), dayjs()],
        },
        {
            label: <div className={`${!dateStatus ? 'active' : ''}`} onClick={() => onRangeChange(null)}>Custom range</div>,
            value: null,
        }
    ];

    const onRangeChange = (dates, dateStrings) => {
        if (dates) {
            // console.log('From: ', dates[0], ', to: ', dates[1]);
            // console.log('From: ', dateStrings[0], ', to: ', dateStrings[1]);

            if (dayjs().format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(1);
            } else if (dayjs().add(-7, 'd').format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(2);
            } else if (dayjs().add(-1, 'M').format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(3);
            } else if (dayjs().add(-3, 'M').format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(4);
            } else if (dayjs().add(-6, 'M').format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(5);
            } else if (dayjs().add(-1, 'y').format(dateFormat) == moment(dateStrings[0], showDateFormat).format(dateFormat)
                && dayjs().format(dateFormat) == moment(dateStrings[1], showDateFormat).format(dateFormat)) {
                setDateStatus(6);
            } else {
                setDateStatus(null);
            }
            setDateRange({
                startDate: moment(dateStrings[0], showDateFormat).format(dateFormat),
                endDate: moment(dateStrings[1], showDateFormat).format(dateFormat),
            });
        } else {
            setDateStatus(null);
            setDateRange({
                startDate: moment().format(dateFormat),
                endDate: moment().format(dateFormat),
            });
        }
    };

    const onCampaignClick = async (status, record) => {
        if (status === 3) {
            var sendData = {
                id: record?.id
            }
            if (dateRange.startDate != dateRange.endDate) {
                sendData['start_date'] = dateRange.startDate;
                sendData['end_date'] = dateRange.endDate;
            }
            const action = await dispatch(userCampaignDelete(sendData));
            if (action.meta.requestStatus !== "fulfilled") {
                errorMessage(action.payload.message)
            }
        } else {
            const action = await dispatch(userCampaignDetails(record?.id));
            if (action.meta.requestStatus === "fulfilled") {
                status === 1 ? handleMessageDetailed() : navigate('/create-campaign', { state: { campaign_data: action.payload } })
            } else {
                errorMessage(action.payload.message)
            }
        }
    }

    const getMenuItems = (record) => {
        const items = [
            {
                label: <div onClick={() => onCampaignClick(1, record)}>Detailed View</div>,
                key: "detailed_view",
            },
            {
                label: <div onClick={() => onCampaignClick(2, record)}>Edit campaign</div>,
                key: 'edit_campaign',
            },
            {
                label: <div onClick={() => onCampaignClick(3, record)}>Delete campaign</div>,
                key: 'delete_campaign',
            },
            {
                label: <div onClick={async () => {
                    const action = await dispatch(userCampaignDetails(record?.id));
                    if (action.meta.requestStatus === "fulfilled") {
                        navigate('/create-campaign', { state: { reuse_campaign_data: action.payload } })
                    } else {
                        errorMessage(action.payload.message)
                    }
                }}>Reuse campaign</div>,
                key: 'reuse_campaign',
            },
        ];

        if (record?.campaign_sent) {
            return items.filter((item) => item.key !== "edit_campaign" && item.key !== "delete_campaign");
        } else if (record?.edit_status) {
            return items.filter((item) => item.key !== "edit_campaign");
        } else {
            return items;
        }
    };

    const columns = [
        {
            title: "#",
            dataIndex: "srno",
            key: "srno",
            ellipsis: true,
            width: 70,
            render: (text, record, index) => (
                <div className="fs-14">{index + 1}</div>
            ),
        },
        {
            title: "MESSAGE TEXT",
            dataIndex: "message_text",
            key: "message_text",
            width: 310,
            render: (text, record) => (
                <div className="cursor-pointer" onClick={async () => {
                    const action = await dispatch(userCampaignDetails(record?.id));
                    if (action.meta.requestStatus === "fulfilled") {
                        handleMessageDetailed()
                    } else {
                        errorMessage(action.payload.message)
                    }
                }}>
                    <div className="text-black fs-14 fw-semibold">{record.campaign_name}</div>
                    <div className="fs-14 fw-normal text-truncate-twolines">
                        {record.msg}
                    </div>
                </div>
            ),
        },
        {
            title: "DATE & TIME",
            dataIndex: "date_time",
            key: "date_time",
            ellipsis: true,
            sorter: (a, b) => {
                const lhsDateTime = `${a.campaign_date} ${a.campaign_time}`;
                const lhsLongTime = moment(lhsDateTime, "Do MMM YYYY HH:mm A").valueOf();

                const rhsDateTime = `${b.campaign_date} ${b.campaign_time}`;
                const rhsLongTime = moment(rhsDateTime, "Do MMM YYYY HH:mm A").valueOf();

                const result = lhsLongTime - rhsLongTime;
                return result;
            },
            render: (text, record) => (
                <div>
                    {record.campaign_date}, <br />{record.campaign_time}
                </div>
            ),
        },
        {
            title: "MESSAGE TYPE",
            dataIndex: "send_on",
            key: "send_on",
            ellipsis: true,
            filters: [
                {
                    text: 'SMS',
                    value: 'SMS',
                },
                {
                    text: 'WhatsApp',
                    value: 'WhatsApp',
                },
            ],
            onFilter: (value, record) => record.send_on.startsWith(value),
            render: (text, record) => (
                <div> {text} </div>
            ),
        },
        {
            title: "Target Users",
            dataIndex: "total_patient",
            key: "total_patient",
            ellipsis: true,
            sorter: (a, b) => a.total_patient - b.total_patient,
            render: (text, record) => (
                <div> {text} </div>
            ),
        },
        {
            title: "CAMPAIGN STATUS",
            dataIndex: "campaign_status",
            key: "campaign_status",
            ellipsis: true,
            render: (text, record) => (
                <>
                    <div className={`fs-14 fw-normal ${record.campaign_sent ? 'text-delivered' : 'text-scheduled'}`}>{record.campaign_sent ? `${record.total_patient} Delivered` : record.campaign_status}</div>
                    {/* <div className="text-faild mt-1">32 Not Delivered</div> */}
                </>
            ),
        },
        {
            title: selectedTab !== TAB_CAMPAIGN && "Action",
            key: "action",
            width: selectedTab !== TAB_CAMPAIGN ? 150 : 70,
            render: (text, record) => (
                selectedTab !== TAB_CAMPAIGN ? (
                    <div className="d-flex">
                        <Button
                            className="btn py-0 btn-videoClose btn-delete-prescription px-0 me-3"
                            onClick={() => onCampaignClick(2, record)}>
                            <img src={editIcon} alt="edit" />
                        </Button>
                        <Button
                            className="btn py-0 btn-videoClose btn-delete-prescription px-0"
                            onClick={() => onCampaignClick(3, record)}>
                            <i className="icon-delete text-main fs-20"></i>
                        </Button>
                    </div>
                ) : (
                    <Dropdown className="cursor-pointer"
                        menu={{
                            items: getMenuItems(record),
                        }}
                        trigger={['click']}>
                        <i className='icon-More'></i>
                    </Dropdown>
                )
            ),
        },
    ];

    const columns_purchase = [
        {
            title: "#",
            dataIndex: "srno",
            key: "srno",
            ellipsis: true,
            width: 70,
            render: (text, record, index) => (
                <div className="py-2 fs-14 fw-normal">{index + 1}</div>
            ),
        },
        {
            title: "TRANSACTION ID",
            dataIndex: "payment_id",
            key: "payment_id",
            width: 310,
            render: (text, record) => (
                <div className="py-2 text-black fw-normal">{text}</div>
            ),
        },
        {
            title: "DESCRIPTION",
            dataIndex: "description",
            key: "description",
            render: (text, record) => (
                <div className="py-2 text-black fw-normal">{text}</div>
            ),
        },
        {
            title: "DATE",
            dataIndex: "date",
            key: "date",
            ellipsis: true,
            sorter: (a, b) => moment(a.date, showDateFormat).valueOf() - moment(b.date, showDateFormat).valueOf(),
            render: (text, record) => (
                <div className="py-2"> {text} </div>
            ),
        },
        {
            title: "CREDITS",
            dataIndex: "credit",
            key: "credit",
            ellipsis: true,
            sorter: (a, b) => a.credit - b.credit,
            render: (text, record) => (
                <div className="py-2">
                    {record.status === 1 ? <img src={RecievedImg} className="me-2" alt="Recieved" /> : <img src={SendImg} className="me-2" alt="Send" />}
                    {`${text} Credits`}
                </div>
            ),
        },
        {
            title: "Txn STATUS",
            dataIndex: "status_show",
            key: "status_show",
            ellipsis: true,
            filters: [
                {
                    text: 'Successful',
                    value: 'Successful',
                },
                {
                    text: 'Failed',
                    value: 'Failed',
                },
            ],
            onFilter: (value, record) => record.status_show.startsWith(value),
            render: (text, record) => (
                <div className={`py-2 ${record.status === 1 ? 'text-delivered' : 'text-faild'}`}> {text} </div>
            ),
        }
    ];

    const handleAvailableCredit = useCallback(
        () => {
            setAvailableCredit(!availableCredit)
        },
        [availableCredit]
    );

    const handleNewTemplate = () => {
        navigate('/create-campaign', { state: { setupData:appointmentAgentsData } });
        const clinic_city = getClinicCity(profile?.hospital_data);
        window.Moengage.track_event("TP_Choose_New_Template", {
            "Doctor_specialty": profile?.dp_name,
            "Doctor_unique_id": profile?.doctor_unique_id,
            clinic_city,
            "Doctor_Name": profile?.um_name,
            "Doctor_mobile_No": profile?.um_contact,
        });
    }

    const emptyText = (
        <div className="d-flex flex-column align-items-center justify-content-center"
            style={{ height: "calc(100vh - 350px)" }}>
            {selectedTab === TAB_PURCHASE ? (
                <>
                    <img width={221.54} height={180} src={emptyPurchase} alt="Empty" />
                    <div className="mt-3 fs-16 fw-medium"> You haven't purchased any credits yet!</div>
                    <div className="mt-2 lh-normal fs-14 fw-normal">Start buying credits to keep your messages flowing.</div>
                    <Button
                        variant="primary"
                        onClick={handleAvailableCredit}
                        className="px-5 btn-41 mt-4">
                        {"Buy Credits"}
                    </Button>
                </>
            ) : (
                <>
                    <img width={221.54} height={180} src={emptyCampaign} alt="Empty" />
                    {selectedTab === TAB_CAMPAIGN ? (
                        <>
                            <div className="fs-16 fw-medium"> You haven't created any SMS or WhatsApp campaigns yet!</div>
                            <div className="mt-2 lh-normal fs-14 fw-normal">Start creating campaigns to keep your patients </div>
                            <div className="mt-2 lh-normal fs-14 fw-normal">informed and engaged</div>
                            <Button
                                onClick={handleNewTemplate}
                                variant="primary"
                                className="px-3 mt-4 btn-41 d-flex align-items-center">
                                <i className="icon-Add me-2"></i>
                                {"Choose new Template"}
                            </Button>
                        </>
                    ) : (
                        <div className="fs-16 fw-medium"> No Dafts found!</div>
                    )}
                </>
            )}
        </div>
    );

    const handleMessageDetailed = useCallback(
        () => {
            setMessageDetailed(!messageDetailed)
        },
        [messageDetailed]
    );

    return (
        <>
            <div className="border rounded-4 appointment-wrap dateborder">
                <Tabs
                    defaultActiveKey={TAB_CAMPAIGN}
                    items={tabItems}
                    className="tabs-massages"
                    onChange={onChange}
                    activeKey={selectedTab}
                />
                <div>
                    <div className="px-4 mb-3 d-flex align-items-center justify-content-between">
                        {selectedTab !== TAB_CAMPAIGN ?
                            <Input
                                className="h-38 w-25 rounded-10px"
                                placeholder={selectedTab === TAB_PURCHASE ? "Search by payment ID" : "Search by template name"}
                                value={searchQuery}
                                onChange={onSearch} />
                            :
                            <div />
                        }
                        <div className="massage-date-wrapper">
                            <div className="fs-14 h-100 w-100 d-flex align-items-center justify-content-between" onClick={handlePickerModal}>
                                <span>
                                    {dateStatus === 1 ? (
                                        'Till date'
                                    ) : dateStatus === 2 ? (
                                        'Last week'
                                    ) : dateStatus === 3 ? (
                                        'Last month'
                                    ) : dateStatus === 4 ? (
                                        'Last 3 month'
                                    ) : dateStatus === 5 ? (
                                        'Last 6 month'
                                    ) : dateStatus === 6 ? (
                                        'Last 1 year'
                                    ) : (
                                        <>
                                            {moment(dateRange.startDate).format(showDateFormat)} - {moment(dateRange.endDate).format(showDateFormat)}
                                        </>
                                    )}
                                </span>
                                <i className="mx-2 fs-18 icon-calendar"></i>
                            </div>
                            <RangePicker
                                disabledDate={(current) => selectedTab !== TAB_CAMPAIGN ? disabledDate(current) : null}
                                open={pickerModal}
                                presets={rangePresets}
                                format={showDateFormat}
                                onChange={onRangeChange}
                                popupClassName="massage-date"
                                className="massage-input"
                                inputReadOnly
                                renderExtraFooter={() =>
                                    <div className="d-flex align-items-center justify-content-between py-1">
                                        <div>{moment(dateRange.startDate).format(showDateFormat)} - {moment(dateRange.endDate).format(showDateFormat)}</div>
                                        <div>
                                            <button className="btn btn-text me-3 px-0" onClick={() => {
                                                setDateStatus(1);
                                                setDateRange({
                                                    startDate: moment().format(dateFormat),
                                                    endDate: moment().format(dateFormat),
                                                });
                                                handlePickerModal()
                                            }}>
                                                <span>Cancel</span>
                                            </button>
                                            <Button className="px-4" type="primary" onClick={handlePickerModal}>
                                                Done
                                            </Button>
                                        </div>
                                    </div>}
                                onOpenChange={() => { }}
                                value={[dateRange.startDate != dateRange.endDate
                                    ? dayjs(moment(dateRange.startDate).format(showDateFormat), showDateFormat)
                                    : "",
                                dateRange.startDate != dateRange.endDate
                                    ? dayjs(moment(dateRange.endDate).format(showDateFormat), showDateFormat)
                                    : ""]
                                }
                            />

                        </div>
                    </div>

                    {selectedTab === TAB_PURCHASE ? (
                        <Table
                            className="px-xl-4 px-0 table-message"
                            columns={columns_purchase}
                            dataSource={purchaseList}
                            pagination={false}
                            locale={{ emptyText: emptyText }}
                            loading={loading}
                        />
                    ) : (
                        <Table
                            className="px-xl-4 px-0 table-message"
                            columns={selectedTab !== TAB_CAMPAIGN ? columns.filter(e => e?.key != "campaign_status") : columns}
                            dataSource={campaignList}
                            pagination={false}
                            locale={{ emptyText: emptyText }}
                            loading={loading}
                        />
                    )}

                </div>
            </div>
            <Drawer
                className="modalWidth-700" width="auto"
                title={`Detailed View (${campaignDetails?.campaign_name})`}
                placement="right"
                closable
                open={messageDetailed}
                onClose={handleMessageDetailed}
            >
                <DetailedView handleMessageDetailed={handleMessageDetailed} replace={false} />
            </Drawer>

            <CommonModal
                isModalOpen={isModalOpen}
                onCancel={showHideModal}
                modalWidth={520}
                title={
                    <>
                        Messages
                        <LoopingVideo
                          webm={newGifWebm}
                          mp4={newGifMp4}
                          width={38}
                          className="ms-2"
                          ariaLabel="New"
                        />
                    </>
                }
                modalBody={
                    <>
                        {/* <img src={messagesVideo} className="img-fluid w-100" /> */}
                        <iframe width="100%" height="263" className="rounded-3" src="https://www.youtube.com/embed/uIDqZtbmlZw?si=ccK5RXNLeL47qtzq" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                        <div className="titleprint fw-semibold mt-4">
                            Reach Your Patients Easily with Messages!
                        </div>
                        <div className="mt-2">
                            This feature allow you to send important updates, reminders, and personalized health tips to your patients all in one place! This feature is designed to save you time, improve communication, and keep your patients engaged in their health journey
                        </div>
                        <Checkbox className="switch-name-check mt-4" checked={checked} onChange={onCheckboxChange}>Don’t show this again</Checkbox>
                        <div className="mt-4">
                            <Button onClick={gotItPress} className="lh-lg btn btn-primary3 btn-41 w-100">
                                <span>Got it</span>
                            </Button>
                        </div>
                    </>
                }
            />

            {/* Message Credits Drawer */}
            <Drawer
                className="modalWidth-645" width="auto"
                title="Buy Message Credits"
                placement="right"
                closable
                open={availableCredit}
                onClose={handleAvailableCredit}
            >
                <AvailableCredits handleAvailableCredit={handleAvailableCredit} />
            </Drawer>
        </>
    );
}

export default React.memo(MessagesData);
