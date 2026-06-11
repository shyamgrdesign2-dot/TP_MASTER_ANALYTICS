import React from "react";
import { useSelector } from "react-redux";
import moment from "moment";
import { ASSETS } from "../../assets";
const messageCorner = ASSETS.images.messageCorner;

// import "./messages.scss";

const showDateFormat = 'DD MMM YYYY'

function DetailedView() {

    const { campaignDetails } = useSelector((state) => state.bulkMessages);

    return (
        <>
            <div className="bg-white overflow-y-auto p-20" style={{ height: 'calc( 100vh - 61px)' }}>
                <div className="fs-18 lh-base">
                    {`The below `}
                    <span className="fw-semibold">{campaignDetails?.campaign_name}</span>
                    {` message will be sent on `}
                    <span className="fw-semibold">{campaignDetails?.campaign_date}</span>
                    {` at `}
                    <span className="fw-semibold">{campaignDetails?.campaign_time} </span> via <span className="fw-semibold">{campaignDetails?.send_on}</span>
                    {` to `}
                    {campaignDetails?.sender_type === 1 ? (
                        <>
                            <span className="fw-semibold"> {`${campaignDetails?.total_patient} patients`} </span>
                        </>
                    ) : (
                        <>
                            <span className="fw-semibold"> {`${campaignDetails?.total_patient} ${campaignDetails?.gender?.split(",")?.length === 1 ? campaignDetails?.gender : ''} patients`} </span>
                            {(campaignDetails?.min_age && campaignDetails?.max_age) ? (
                                <>
                                    {` of age between `}
                                    <span className="fw-semibold"> {`${campaignDetails?.min_age}-${campaignDetails?.max_age} ${campaignDetails?.min_age_unit}`} </span>
                                </>
                            ):null}
                            {` who visited in the `}
                            <span className="fw-semibold">{`${campaignDetails?.date_unit === 'custom' ? moment(campaignDetails?.start_date).format(showDateFormat) + " to " + moment(campaignDetails?.end_date).format(showDateFormat) : campaignDetails?.date_unit}`}</span>
                        </>
                    )}
                </div>

                <div className={`${campaignDetails?.send_on === 'SMS' ? 'bg-selected' : 'bg-whatsup-message'} w-100 mt-4 py-3 rounded-20px d-flex justify-content-center align-items-center`} style={{ minHeight: 138 }}>
                    <div className="bg-white w-60 fw-medium rounded-4 p-3 position-relative">{campaignDetails?.msg}
                        <img className="position-absolute" style={{ left: -2, bottom: -3 }} src={messageCorner} alt="Message" />
                    </div>
                </div>

                <div className="mt-4">
                    <div className="fontroboto title-hypertension">Credit Details</div>
                    <div className="title-common my-2 text-black-50">{`( 1 ${campaignDetails?.send_on === 'SMS' ? 'SMS' : 'WhatsApp Message'} = ${campaignDetails?.per_credit} Credits)`}</div>

                    <div className="mt-4 mb-3">
                        <div className="d-flex align-items-center py-2 justify-content-between fs-18 fw-medium fontroboto">
                            <div>Target Customers (A) :</div>
                            <div>{`${campaignDetails?.total_patient} User`}</div>
                        </div>
                        <div className="d-flex align-items-center py-2 justify-content-between fs-18 fw-medium fontroboto">
                            <div>{`${campaignDetails?.send_on === 'SMS' ? 'SMS' : 'Message'} Per Customers (B) :`}</div>
                            <div>{`${campaignDetails?.sms_per_customer} ${campaignDetails?.send_on === 'SMS' ? 'SMS' : 'Message'}`}</div>
                        </div>
                        <div className="d-flex align-items-center py-2 justify-content-between fs-18 fw-medium fontroboto">
                            <div>{`Price Per ${campaignDetails?.send_on === 'SMS' ? 'SMS' : 'Message'} (C) :`}</div>
                            <div>{`${campaignDetails?.per_credit} Credits`}</div>
                        </div>

                        {/* <hr />

                        <div className="d-flex align-items-center py-2 justify-content-between fs-18 fw-medium fontroboto">
                            <div>Total Credits Required (ABC) :</div>
                            <div>324 Credits</div>
                        </div>
                        <div className="d-flex align-items-center py-2 justify-content-between fs-18 fw-medium fontroboto">
                            <div className="text-faild">Undelivered Messages</div>
                            <div className="text-faild">32 Message</div>
                        </div>
                        <div className="d-flex align-items-center py-2 justify-content-between fs-18 fw-medium fontroboto">
                            <div>Refundable Credits</div>
                            <div>(-)24 Credits</div>
                        </div> */}

                        <hr />

                        <div className="d-flex align-items-center justify-content-between fs-18 fw-semibold fontroboto">
                            <div>Total Credits Required (ABC) :</div>
                            <div className="fw-medium">{`${campaignDetails?.total_credit} Credits`}</div>
                        </div>
                        <hr />
                    </div>
                    {/* <div className="text-greycolor">We will refund the credits for undelivered messages within 48 hours of delivery</div> */}
                </div>
            </div>
        </>
    );
}

export default React.memo(DetailedView);