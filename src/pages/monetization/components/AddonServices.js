import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Checkbox, Popover } from "antd";
import { useSelector } from "react-redux";

import { currencyFormat, formatAmount } from "../../../utils/utils";
import { S_ASK_TATVA, S_BILLING, S_DDX, S_IPD, S_PHARMACY, S_RECEPTIONIST_AGENT, S_VOICE_RX } from "../../../utils/constants";
import { ASSETS } from "../../../assets";
const {
  microphoneVoiceRx: RxVoice,
  iconAskTatva: AskTatvaIcon,
  opdBillingIcon: OPDBillingIcon,
  pharmacyIcon: PharmacyIcon,
  ipdIcon: IPDIcon,
  ddxIcon: DDXIcon,
  receptionistIcon: RECEPTIONISTIcon,
  aiPowered,
  includesDevider: deviderIncludes,
} = ASSETS.images;

function AddonServices({ item, addOrNot, handleAddRemove, clickKnowMore }) {

    const getIcon = (service_name) => {
        switch (service_name) {
            case S_VOICE_RX:
                return RxVoice;
            case S_ASK_TATVA:
                return AskTatvaIcon;
            case S_BILLING:
                return OPDBillingIcon;
            case S_PHARMACY:
                return PharmacyIcon;
            case S_IPD:
                return IPDIcon;
            case S_DDX:
                return DDXIcon;
            case S_RECEPTIONIST_AGENT:
                return RECEPTIONISTIcon;
            default:
                return "";
        }
    }

    const contentAIAppointment = (
        <div><span className="fw-semibold">AI Appointment Booking</span> lets patients   <br />
            schedule appointments online<br />
            anytime, with bookings automatically<br />
            synced to your clinic’s calendar— <br />
            reducing calls and making<br />
            scheduling effortless for both patients<br />
            and staff. </div>
    );

    const contentSymptomCollector = (
        <div><span className="fw-semibold">AI Symptom Collector</span> allows patients <br />
            to share symptoms while booking <br />
            their appointment, sending details <br />
            directly to your EMR so doctors are <br />
            prepared before the consultation. </div>
    );

    return (
        <>
            <div className={`addon-box ${addOrNot && 'box-added'}`}>
                {item.must_have === 'true' && (<div className="tag-recommend">Must Have</div>)}
                <div className="d-flex align-items-center justify-content-between">
                    <div>
                        <div className="fs-4 text-welcome fw-semibold my-2">
                            <img style={{ background: '#EDDFF780', padding: 6 }} className="rounded-10px me-2" src={getIcon(item?.service_name)} alt="item.type" />
                            {item.service_display_name}
                            {item.service_type === 'ai' && (<img src={aiPowered} alt="Icon" className="p-1 rounded-10px ms-2" />)}
                        </div>
                        <div>
                            <div className="fs-14">{item.service_description}&nbsp;
                                <span className="text-decoration-underline fw-medium text-main cursor-pointer" onClick={clickKnowMore}>
                                    Know more
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="addon-box-price mx-4">
                        <div className="d-flex align-items-end">
                            <div className="fw-semibold text-price lh-1 fs-4">
                                {`₹${currencyFormat(formatAmount(parseFloat(item.service_cost)))}`}
                            </div>
                            <div className="text-price fs-18">/year</div>
                        </div>
                        <div className="d-flex align-items-center justify-content-center mt-1">
                            {item?.discount && (
                                <>
                                    <div className="text-black-50 text-decoration-line-through me-2">{`₹${currencyFormat(item.strike_off_cost)}`}</div>
                                    <div className="access-off px-2 py-1 rounded-pill fw-semibold fs-12-1 text-white">{`${item?.discount}% off`}</div>
                                </>
                            )}
                        </div>
                    </div>
                    <div>
                        <Button className={`btn d-flex rounded-10px align-items-center justify-content-center ms-4 ${!addOrNot ? 'btn-addon' : 'btn-added'}`} onClick={handleAddRemove}>
                            <i className={`me-2 ${!addOrNot ? 'icon-Add fs-18 ' : 'fs-4 icon-check'}`}></i> {!addOrNot ? 'Add' : 'Added'}
                        </Button>
                    </div>
                </div>
                {item.service_name === S_RECEPTIONIST_AGENT && (
                    <div className="includes-box after-receptionist mt-3">
                        <div className="d-flex align-items-center justify-content-between my-2">
                            <div className="d-flex align-items-center">
                                <div className="include-div me-2">AI Appointment Booking</div>
                                <Popover trigger="hover" content={contentAIAppointment}>
                                    <i className="icon-info fs-5 text-black-50"></i>
                                </Popover>
                            </div>
                            <div className="text-black-50 fs-14 include-text">
                                Included by default
                            </div>
                        </div>
                        <img className="d-block img-fluid mx-auto my-2 my-xl-4" src={deviderIncludes} alt="Includes" />
                        <div className="d-flex align-items-center justify-content-between my-2">
                            <div className="d-flex align-items-center">
                                <div className="include-div me-2">AI Symptom Collector</div>
                                <Popover trigger="hover" content={contentSymptomCollector}>
                                    <i className="icon-info fs-5 text-black-50"></i>
                                </Popover>
                            </div>
                            <div className="text-black-50 fs-14 include-text">
                                Included by default
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default React.memo(AddonServices);
