import React from "react";
import { Button, Spin } from "antd";
import { Navbar } from 'react-bootstrap';
import { isMobile } from "react-device-detect";

import { NORMAL } from "../../utils/constants";
import Quixote from "../../pages/Quixote";
import { ASSETS } from "../../assets";
const wtsp = ASSETS.images.wtsp;

function WhatsappConfigureView(props) {

    const { handleDrawerWhatsappView, todayVaccines, growthChartDetails, obstetricDetails, patientBills, advanceReceipts, patientWalletBalance } = props

    return (
        <>
            <Navbar className="justify-content-between headerprescription bg-white p-0">
                <div className='align-items-center d-flex w-100 h-100 justify-content-between'>
                    <div className='align-items-center d-flex h-100 w-100'>
                        <div className='border-end h-100 text-center me-4'>
                            <div className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer' onClick={handleDrawerWhatsappView}>
                                <i className='icon-right'></i>
                            </div>
                        </div>
                        <div className='title-common'>
                            WhatsApp Rx Preview
                        </div>
                    </div>
                    <div className='d-flex align-items-center justify-content-end w-100'>
                        <Button type='button' className="btn-41 btn px-4 btn-primary3 me-4" onClick={handleDrawerWhatsappView}>
                            Done
                        </Button>
                    </div>
                </div>
            </Navbar>
            <div className="mx-auto overflow-y-auto " style={{ width: isMobile ? 580 : 900 }} >
                <div className="titleprint mt-20"><img className="img-fluid me-2" width={25} src={wtsp} alt="WhatsApp" /> WhatsApp Preview</div>
                <div className="rounded-20px bg-white mt-20 overflow-hidden">
                    <div className="position-relative printheight">
                        <Quixote mode={NORMAL} todayVaccines={todayVaccines} growthChartDetails={growthChartDetails} obstetricDetails={obstetricDetails} patientBills={patientBills} advanceReceipts={advanceReceipts} patientWalletBalance={patientWalletBalance} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default React.memo(WhatsappConfigureView);