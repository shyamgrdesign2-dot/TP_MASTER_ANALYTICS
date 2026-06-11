import React, { useState, useEffect, useCallback } from "react";
import { Col, Row } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { Spin, Drawer } from "antd";
import { useLocation } from 'react-router-dom';

import HeaderUnlimitedAccess from "../../common/HeaderUnlimitedAccess";
import TatvaPracticeEMR from "./components/TatvaPracticeEMR";
import SmartSyncPro from "./components/SmartSyncPro";
import AddonServices from "./components/AddonServices";
import CampaignDiscount from "./components/CampaignDiscount";
import UnlimitedAccessSummary from "./components/UnlimitedAccessSummary";
import { S_TATVA_PRACTICE, S_SMARTSYNC, S_VOICE_RX, S_DDX, S_RX_DIGITIZATION, S_IPD, S_ASK_TATVA, S_PHARMACY, S_BILLING, S_RECEPTIONIST_AGENT, PAID, FREE } from "../../utils/constants";
import { services } from "../../redux/doctorsSlice";

import GenRxKnowMore from "../../components/GenRxKnowMore";
import SmartSyncKnowMore from "./components/SmartSyncKnowMore";
import CvtKnowMore from "../smartSync/components/CvtKnowMore";
import DDxKnowMore from "../../components/DDxKnowMore";
import IPDKnowMore from "./components/IPDKnowMore";
import AskTatvaKnowMore from "./components/AskTatvaKnowMore";
import PharmacyKnowMore from "./components/PharmacyKnowMore";
import BillingKnowMore from "./components/BillingKnowMore";
import MedEcoAppKnowMore from "./components/MedEcoAppKnowMore";
import { deviceType, osName } from "react-device-detect";

import "./GetUnlimitedAccess.scss";
import { getClinicName, getDeviceSdkData, getTokenData } from "../../utils/utils";

function GetUnlimitedAccess() {

    const { profile, servicesLoading, servicesList } = useSelector((state) => state.doctors);
    const { planDetails } = useSelector((state) => state.subscription);
    const { service_mappings } = planDetails || {};
    const dispatch = useDispatch();

    const { state } = useLocation();
    const { buyServiceName } = state != null && state;

    const [servicesData, setServicesData] = useState([]);
    const [checked, setChecked] = useState(false);
    const [selectedServices, setSelectedServices] = useState([]);
    const [genRxKnowMoreDrawer, setGenRxKnowMoreDrawer] = useState(false);
    const [ddxKnowMoreDrawer, setDDxKnowMoreDrawer] = useState(false);
    const [smartSyncKnowMoreDrawer, setSmartSyncKnowMoreDrawer] = useState(false);
    const [cvtDrawer, setCvtDrawer] = useState(false);
    const [askTatvaKnowMoreDrawer, setAskTatvaKnowMoreDrawer] = useState(false);
    const [iPDKnowMoreDrawer, setIPDKnowMoreDrawer] = useState(false);
    const [pharmacyKnowMoreDrawer, setPharmacyKnowMoreDrawer] = useState(false);
    const [billingDrawer, setBillingDrawer] = useState(false);
    const [medEcoKnowMoreDrawer, setMedEcoKnowMoreDrawer] = useState(false);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        dispatch(services(profile?.b2c));
    }, []);

    useEffect(() => {
        if (servicesList?.length && planDetails) {
            const updateArray = servicesList.map(service => {
                if (service.service_type !== "ai") {
                    const matchedPlan = service_mappings.find(plan => plan.service_name === service.service_name);
                    if (matchedPlan) {
                        return {
                            ...service,
                            purchased: matchedPlan.plan_tier === PAID ? 'true' : 'false',
                            plan_tier: matchedPlan.plan_tier === PAID ? PAID : FREE,
                            plan_start_date: matchedPlan.plan_active_date,
                            plan_end_date: matchedPlan.plan_expiry_date
                        };
                    }
                }
                return service;
            });

            // const jsonArray = servicesList?.filter(({ purchased }) => purchased == 'false')
            const jsonArray = updateArray?.filter(({ purchased }) => purchased == 'false')
            const result = [];
            const groupedServices = [];

            jsonArray.forEach(service => {
                if (service.service_name === S_SMARTSYNC) {
                    groupedServices.unshift(service);
                } else if (service.service_name === S_RX_DIGITIZATION) {
                    groupedServices.push(service);
                } else {
                    result.push(service);
                }
            });

            // if (groupedServices.length > 0) {
            //     result.splice(1, 0, { data: groupedServices });
            // }
            if (groupedServices.length > 0) {
                result.unshift({ data: groupedServices });
            }

            if (buyServiceName !== undefined) {
                let updatedResult = result
                if (buyServiceName === S_RX_DIGITIZATION) {
                    setServicesData(updatedResult)
                } else {
                    const EMR_index = updatedResult.findIndex(e => e.service_name === S_TATVA_PRACTICE);
                    const index = updatedResult.findIndex(e => e.service_name === buyServiceName);
                    if (EMR_index != -1) {
                        const [obj] = updatedResult.splice(index, 1);
                        updatedResult.unshift(obj);
                        setServicesData(updatedResult)
                    } else {
                        const [obj] = updatedResult.splice(index, 1);
                        updatedResult.unshift(obj);
                        setServicesData(updatedResult)
                    }
                }
            } else {
                setServicesData(result)
            }

            let defaultService = []
            if (buyServiceName !== undefined) {
                if (buyServiceName === S_RX_DIGITIZATION) {
                    const isSmartRxPurchased = jsonArray?.some(e => e.service_name === S_SMARTSYNC)
                    defaultService = jsonArray
                        ?.filter(({ service_name }) => !isSmartRxPurchased ? service_name === buyServiceName : service_name === S_SMARTSYNC || service_name === S_RX_DIGITIZATION)
                        ?.map(service => ({ ...service, validity: 12 }))
                    setChecked(true)
                } else {
                    defaultService = jsonArray
                        ?.filter(({ service_name }) => service_name === buyServiceName)
                        ?.map(service => ({ ...service, validity: 12 }))
                }
            }
            // else {
            //     defaultService = jsonArray
            //         ?.filter(({ service_name }) => service_name === S_TATVA_PRACTICE)
            //         ?.map(service => ({ ...service, validity: 1 }))
            // }
            defaultService?.unshift(...jsonArray
                ?.filter(({ service_name }) => service_name === S_TATVA_PRACTICE)
                ?.map(service => ({ ...service, validity: 12 })))
            setSelectedServices(defaultService)
        }
    }, [servicesList, planDetails]);

    const handleAddRemove = useCallback((item) => {
        setSelectedServices(prev => {
            const exists = prev.find(e => e.service_name === item.service_name);
            if (exists) {
                return prev.filter(e => e.service_name !== item.service_name);
            } else {
                return [...prev, { ...item, validity: 12 }];
            }
        });
        const clinic_name = getClinicName(profile?.hospital_data);
        const tokenData = getTokenData(); 
        const deviceSdkData = getDeviceSdkData(); 
        window.Moengage.track_event("TP_Monetization_AddService", {
            doctor_name: profile?.um_name,
            doctor_number: profile?.um_contact,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_specialty: profile?.dp_name,
            clinic_id: tokenData?.clinic_id,
            um_id: tokenData?.user_id,
            clinic_Name: clinic_name,
            ...deviceSdkData
        });
    }, [selectedServices]);

    const handleSmartSyncAddRemove = useCallback((item) => {
        if (checked) {
            setSelectedServices(prev => {
                const newSelection = [...prev];
                item.forEach(service => {
                    const index = newSelection.findIndex(e => e.service_name === service.service_name);
                    if (index !== -1) {
                        newSelection.splice(index, 1);
                    } else {
                        newSelection.push({ ...service, validity: 12 });
                    }
                });
                return newSelection;
            });
        } else {
            setSelectedServices(prev => {
                const exists = prev.find(e => e.service_name === item[0].service_name);
                if (exists) {
                    return prev.filter(e => e.service_name !== item[0].service_name);
                } else {
                    return [...prev, { ...item[0], validity: 12 }];
                }
            });
        }
        const clinic_name = getClinicName(profile?.hospital_data);
        const tokenData = getTokenData(); 
        const deviceSdkData = getDeviceSdkData(); 
        window.Moengage.track_event("TP_Monetization_AddService", {
            doctor_name: profile?.um_name,
            doctor_number: profile?.um_contact,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_specialty: profile?.dp_name,
            clinic_id: tokenData?.clinic_id,
            um_id: tokenData?.user_id,
            clinic_Name: clinic_name,
            ...deviceSdkData
        });
    }, [selectedServices, checked]);

    const clickKnowMore = (service_name) => {
        if (service_name === S_VOICE_RX) {
            handleGenRxKnowMore()
        } else if (service_name === S_SMARTSYNC) {
            handleSmartSyncKnowMore()
        } else if (service_name === S_RX_DIGITIZATION) {
            handleDrawerCvtKnowMore()
        } else if (service_name === S_DDX) {
            handleDDxKnowMore()
        } else if (service_name === S_IPD) {
            handleIPDKnowMore()
        } else if (service_name === S_ASK_TATVA) {
            handleAskTatvaKnowMore()
        } else if (service_name === S_PHARMACY) {
            handlePharmacyKnowMore()
        } else if (service_name === S_BILLING) {
            handleBillingKnowMore()
        } else if (service_name === S_TATVA_PRACTICE) {
            handleMedEcoKnowMore()
        } else if (service_name === S_RECEPTIONIST_AGENT) {
            handleMedEcoKnowMore()
        }
    }

    const handleGenRxKnowMore = () => {
        setGenRxKnowMoreDrawer((prev) => !prev);
    };

    const handleDDxKnowMore = () => {
        setDDxKnowMoreDrawer((prev) => !prev);
    };

    const handleSmartSyncKnowMore = () => {
        setSmartSyncKnowMoreDrawer((prev) => !prev);
    };

    const handleDrawerCvtKnowMore = () => {
        setCvtDrawer((prev) => !prev);
    };

    const handleAskTatvaKnowMore = () => {
        setAskTatvaKnowMoreDrawer((prev) => !prev);
    };

    const handleIPDKnowMore = () => {
        setIPDKnowMoreDrawer((prev) => !prev);
    };

    const handlePharmacyKnowMore = () => {
        setPharmacyKnowMoreDrawer((prev) => !prev);
    };

    const handleBillingKnowMore = () => {
        setBillingDrawer((prev) => !prev);
    };

    const handleMedEcoKnowMore = () => {
        setMedEcoKnowMoreDrawer((prev) => !prev);
    };

    const handleShowAll = useCallback(() => {
        setShowAll(!showAll)
    }, [showAll]);

    return (
        <>
            <HeaderUnlimitedAccess />
            <div className="unlimited-access-wrapper overflow-y-auto" style={{ height: 'calc(100vh - 60px)' }}>
                {!servicesLoading ? (
                    <>
                        {/* <CampaignDiscount flag={1} title={buyServiceName} /> */}
                        <div className="bg-unlimited-access h-100">
                            {servicesData?.length > 0 && (
                                <Row className="g-4">
                                    <Col xl={8} lg={8} md={12} sm={12} xs={12}>
                                        {servicesData?.find(item => item.service_name === S_TATVA_PRACTICE) !== undefined && (
                                            <TatvaPracticeEMR
                                                item={servicesData?.find(item => item.service_name === S_TATVA_PRACTICE)}
                                                clickKnowMore={() => clickKnowMore(servicesData?.find(item => item.service_name === S_TATVA_PRACTICE).service_name)}
                                            />
                                        )}
                                        <div className="addon-access mt-2 mb-5">
                                            {servicesData?.filter(item => item.service_name !== S_TATVA_PRACTICE)?.slice(0, showAll ? servicesData?.filter(item => item.service_name !== S_TATVA_PRACTICE)?.length : buyServiceName !== undefined ? 1 : 3).map((item, index) => {
                                                return (
                                                    <div key={index}>
                                                        {item.hasOwnProperty("data") ? (
                                                            <SmartSyncPro
                                                                data={item?.data}
                                                                addOrNot={selectedServices?.some(e => e.service_name === S_SMARTSYNC || e.service_name === S_RX_DIGITIZATION)}
                                                                handleSmartSyncAddRemove={() => handleSmartSyncAddRemove(item?.data)}
                                                                checked={checked}
                                                                setChecked={setChecked}
                                                                selectedServices={selectedServices}
                                                                setSelectedServices={setSelectedServices}
                                                                clickKnowMore={() => clickKnowMore(item?.data[0]?.service_name)}
                                                            />
                                                        ) : (
                                                            <AddonServices
                                                                item={item}
                                                                addOrNot={selectedServices?.some(e => e.service_name === item.service_name)}
                                                                handleAddRemove={() => handleAddRemove(item)}
                                                                clickKnowMore={() => clickKnowMore(item.service_name)}
                                                            />
                                                        )}
                                                    </div>
                                                )
                                            })}
                                            <div className="addons-expand-collapse align-items-center d-flex" onClick={handleShowAll}>
                                                View {showAll ? 'less' : 'more'} add-ons <i className={`ms-2 icon-right ${showAll ? 'iconrotatehistory90' : 'iconrotate270'} `}></i>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col xl={4} lg={4} md={12} sm={12} xs={12}>
                                        <UnlimitedAccessSummary
                                            selectedServices={selectedServices}
                                            setSelectedServices={setSelectedServices}
                                        />
                                    </Col>
                                </Row>
                            )}
                        </div>
                    </>
                ) : (
                    <Spin className="flex-fill align-self-center" />
                )}

                {genRxKnowMoreDrawer && (
                    <Drawer
                        closeIcon={false}
                        placement="right"
                        open={genRxKnowMoreDrawer}
                        onClose={handleGenRxKnowMore}
                        className=".modalWidth-800"
                        width={825}
                    >
                        <GenRxKnowMore 
                            handleGenRxKnowMore={handleGenRxKnowMore} 
                            isOpen={genRxKnowMoreDrawer}
                        />
                    </Drawer>
                )}

                {ddxKnowMoreDrawer && (
                    <Drawer
                        closeIcon={false}
                        placement="right"
                        open={ddxKnowMoreDrawer}
                        onClose={handleDDxKnowMore}
                        className=".modalWidth-800"
                        width={825}
                    >
                        <DDxKnowMore handleDDxKnowMore={handleDDxKnowMore} />
                    </Drawer>
                )}

                {smartSyncKnowMoreDrawer && (
                    <Drawer
                        closeIcon={false}
                        placement="right"
                        open={smartSyncKnowMoreDrawer}
                        onClose={handleSmartSyncKnowMore}
                        className=".modalWidth-800"
                        width={600}
                    >
                        <SmartSyncKnowMore handleSmartSyncKnowMore={handleSmartSyncKnowMore} />
                    </Drawer>
                )}

                {cvtDrawer && (
                    <Drawer
                        closeIcon={false}
                        placement="right"
                        onClose={handleDrawerCvtKnowMore}
                        open={cvtDrawer}
                        className=".modalWidth-800"
                        width={800}
                    >
                        <CvtKnowMore handleDrawerCvtKnowMore={handleDrawerCvtKnowMore} handleCollapsed={handleDrawerCvtKnowMore} />
                    </Drawer>
                )}

                {askTatvaKnowMoreDrawer && (
                    <Drawer
                        closeIcon={false}
                        placement="right"
                        open={askTatvaKnowMoreDrawer}
                        onClose={handleAskTatvaKnowMore}
                        className=".modalWidth-800"
                        width={600}
                    >
                        <AskTatvaKnowMore handleAskTatvaKnowMore={handleAskTatvaKnowMore} />
                    </Drawer>
                )}

                {iPDKnowMoreDrawer && (
                    <Drawer
                        closeIcon={false}
                        placement="right"
                        open={iPDKnowMoreDrawer}
                        onClose={handleIPDKnowMore}
                        className=".modalWidth-800"
                        width={600}
                    >
                        <IPDKnowMore handleIPDKnowMore={handleIPDKnowMore} />
                    </Drawer>
                )}

                {pharmacyKnowMoreDrawer && (
                    <Drawer
                        closeIcon={false}
                        placement="right"
                        open={pharmacyKnowMoreDrawer}
                        onClose={handlePharmacyKnowMore}
                        className=".modalWidth-800"
                        width={600}
                    >
                        <PharmacyKnowMore handlePharmacyKnowMore={handlePharmacyKnowMore} />
                    </Drawer>
                )}

                {billingDrawer && (
                    <Drawer
                        closeIcon={false}
                        placement="right"
                        open={billingDrawer}
                        onClose={handleBillingKnowMore}
                        className=".modalWidth-800"
                        width={600}
                    >
                        <BillingKnowMore handleBillingKnowMore={handleBillingKnowMore} />
                    </Drawer>
                )}

                {medEcoKnowMoreDrawer && (
                    <Drawer
                        closeIcon={false}
                        placement="right"
                        open={medEcoKnowMoreDrawer}
                        onClose={handleMedEcoKnowMore}
                        className=".modalWidth-800"
                        width={600}
                    >
                        <MedEcoAppKnowMore handleMedEcoKnowMore={handleMedEcoKnowMore} />
                    </Drawer>
                )}

            </div>
        </>
    );
}

export default GetUnlimitedAccess;
