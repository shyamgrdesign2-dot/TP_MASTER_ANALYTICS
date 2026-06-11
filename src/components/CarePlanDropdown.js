import React, { useState, useEffect, useCallback } from "react";
import { Input, Button, Select, Spin } from 'antd';
import { LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { errorMessage } from "../utils/utils";
import { getCarePlanNames, getCarePlanAssignments, assignCarePlan } from "../pages/smartSync/services/carePlanService";
import { GB_CARE_PLAN } from "../utils/constants";
import { ASSETS } from "../assets";
const carePlanIcon = ASSETS.images.onboardPageIcons.health;

const { Option } = Select;

function CarePlanDropdown({ onCarePlanSelect, selectedCarePlan, patientId, doctorId, clinicId, placeholder }) {
    const [carePlans, setCarePlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [filteredPlans, setFilteredPlans] = useState([]);
    
    // GrowthBook feature flag check
    const isCarePlanEnabled = useFeatureIsOn(GB_CARE_PLAN);

   
    useEffect(() => {
        if (searchValue.trim() === '') {
            setFilteredPlans(carePlans);
        } else {
            const filtered = carePlans.filter(plan => 
                plan.plan_name.toLowerCase().includes(searchValue.toLowerCase())
            );
            setFilteredPlans(filtered);
        }
    }, [searchValue, carePlans]);

    const loadCarePlans = async () => {
        try {
            setLoading(true);
            const response = await getCarePlanNames();
            
            
            const plansData = Array.isArray(response) ? response : [];
            
            const transformedPlans = plansData.map(plan => ({
                plan_id: plan.id, // Use the UUID as plan_id
                plan_name: plan.plan_name
            }));
            
            setCarePlans(transformedPlans);
            setFilteredPlans(transformedPlans);
        } catch (error) {
            console.error('Failed to load care plans:', error);
            errorMessage('Failed to load care plans. Please try again.');
            setCarePlans([]);
            setFilteredPlans([]);
        } finally {
            setLoading(false);
        }
    };

    
    const handleDropdownFocus = useCallback(() => {
        if (carePlans.length === 0 && !loading) {
            loadCarePlans();
        }
    }, [carePlans.length, loading]);

    const handleSearchChange = useCallback((value) => {
        setSearchValue(value);
    }, []);

    const handlePlanSelect = useCallback((planId) => {
        if (planId === "none") {
            
            if (onCarePlanSelect) {
                onCarePlanSelect(null);
            }
        } else {
            const selectedPlan = carePlans.find(plan => plan.plan_id === planId);
            if (selectedPlan && onCarePlanSelect) {
                onCarePlanSelect(selectedPlan);
            }
        }
    }, [carePlans, onCarePlanSelect]);

    const handleAssignCarePlan = async (plan) => {
        try {
            if (!patientId || !doctorId || !clinicId) {
                errorMessage('Missing required information for care plan assignment');
                return;
            }

            
            const assignResponse = await assignCarePlan({
                plan_id: plan.plan_id,
                um_id: doctorId,
                patient_unique_id: patientId,
                hm_id: clinicId
            });

            if (assignResponse) {
                
                window.Moengage.track_event("care_plan_assigned", {
                    plan_id: plan.plan_id,
                    plan_name: plan.plan_name,
                    patient_id: patientId,
                    doctor_id: doctorId,
                    clinic_id: clinicId
                });
                
                if (onCarePlanSelect) {
                    onCarePlanSelect(plan);
                }
            }
        } catch (error) {
            console.error('Failed to assign care plan:', error);
            errorMessage('Failed to assign care plan. Please try again.');
        }
    };

    // Don't render if feature flag is disabled
    if (!isCarePlanEnabled) {
        return null;
    }

    return (
        <>
            <div style={{padding: "6px"}}>
                <div className="d-flex align-items-center mb-14">
                    {/* <img className='me-2' src={carePlanIcon} alt="Care Plan" style={{ width: '22px', height: '22px', filter: 'brightness(0) saturate(100%) invert(20%) sepia(100%) saturate(2000%) hue-rotate(270deg) brightness(90%) contrast(100%)' }} /> */}
                    <div className="title-common">Assign New Care Plan</div>
                </div>
                
                <div className="d-flex care-plan-dropdown mt-3">
                    <Select
                        className="w-100"
                        placeholder={placeholder || "Select care plan"}
                        showSearch
                        labelInValue
                        value={selectedCarePlan? {value: selectedCarePlan.plan_id, label: selectedCarePlan.plan_name} : undefined}
                        onSearch={handleSearchChange}
                        onChange={(option) => handlePlanSelect(option?.value)}
                        onFocus={handleDropdownFocus}
                        onDropdownVisibleChange={(open) => {
                            if (open) {
                                handleDropdownFocus();
                            }
                        }}
                        loading={loading}
                        filterOption={false}
                        notFoundContent={loading ? <Spin size="small" /> : 'No care plans found'}
                        //allowClear
                    >
                        <Option key="none" value="none">
                            None
                        </Option>
                        {filteredPlans.map((plan) => (
                            <Option key={plan.plan_id} value={plan.plan_id}>
                                {plan.plan_name}
                            </Option>
                        ))}
                    </Select>
                </div>

            </div>
        </>
    );
}

export default React.memo(CarePlanDropdown);
