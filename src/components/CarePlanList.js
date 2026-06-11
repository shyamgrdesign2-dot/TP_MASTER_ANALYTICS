import React, { useState, useEffect } from "react";
import { List, Spin, Empty, Typography } from 'antd';
import { LoadingOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { getCarePlanAssignments } from "../pages/smartSync/services/carePlanService";
import { GB_CARE_PLAN } from "../utils/constants";

import "./CarePlanList.scss";
import { ASSETS } from "../assets";
const carePlanIcon = ASSETS.images.onboardPageIcons.health;
const adviceIcon = ASSETS.images.carePlanActive;

const { Text } = Typography;

function CarePlanList({ patientId, selectedTcmId, onCarePlanSelect, readOnly = false, title = "Assigned Care Plans", hideWhenEmpty = false }) {
    const [assignedCarePlans, setAssignedCarePlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // GrowthBook feature flag check
    const isCarePlanEnabled = useFeatureIsOn(GB_CARE_PLAN);

    const loadAssignedCarePlans = async () => {
        if (!patientId || !isCarePlanEnabled) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await getCarePlanAssignments(patientId);
           
            
            // Transform the response data
            const plansData = Array.isArray(response) ? response : [];
            const transformedPlans = plansData.map(plan => ({
                id: plan.id || plan.tcm_id,
                tcm_id: plan.tcm_id,
                plan_name: plan.plan_name,
                assigned_date: plan.updated_date || plan.created_date, // Use updated_date first, then created_date
                status: plan.status || 'active',
                doctor_name: plan.doctor_name,
                clinic_name: plan.clinic_name
            }));
            
            // Sort by assigned date from most recent to oldest
            const sortedPlans = transformedPlans.sort((a, b) => {
                const dateA = new Date(a.assigned_date);
                const dateB = new Date(b.assigned_date);
                return dateB - dateA; // Most recent first
            });
            
            setAssignedCarePlans(sortedPlans);
        } catch (error) {
            console.error('Failed to load assigned care plans:', error);
            setError('Failed to load assigned care plans');
            setAssignedCarePlans([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAssignedCarePlans();
    }, [patientId, isCarePlanEnabled]);

    // Don't render if feature flag is disabled
    if (!isCarePlanEnabled) {
        return null;
    }

    // Hide the entire care plan list if no care plans are assigned AND hideWhenEmpty is true
    if (!loading && !error && assignedCarePlans.length === 0 && hideWhenEmpty) {
        return null;
    }

    const handleCarePlanClick = (plan) => {
        if (!readOnly && onCarePlanSelect) {
            onCarePlanSelect(plan);
        }
    };

    const renderCarePlanItem = (plan) => {
        const assignedDate = plan.assigned_date ? new Date(plan.assigned_date) : null;
        const formattedDate = assignedDate ? assignedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 'Date not available';
        
        return (
            <List.Item
                key={plan.id}
                onClick={() => handleCarePlanClick(plan)}
                style={{
                    cursor: readOnly ? 'default' : 'pointer',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    backgroundColor: selectedTcmId && Number(selectedTcmId) === Number(plan.tcm_id) ? '#f0f9ff' : 'transparent',
                    border: selectedTcmId && Number(selectedTcmId) === Number(plan.tcm_id) ? '1px solid #1890ff' : '1px solid #f0f0f0',
                    transition: 'all 0.2s ease',
                    opacity: readOnly ? 0.8 : 1
                }}
                className="care-plan-item"
            >
                <div style={{ width: '100%' }}>
                    {/* Date displayed prominently */}
                    <div className="mb-2">
                        <Text type="secondary" style={{ fontSize: '12px', fontWeight: '500', color: '#8c8c8c' }}>
                            {formattedDate}
                        </Text>
                    </div>
                    
                    {/* Care plan name */}
                    <div className="mb-2">
                        <Text strong style={{ fontSize: '14px', color: '#262626' }}>
                            {plan.plan_name}
                        </Text>
                    </div>
                </div>
            </List.Item>
        );
    };

    return (
        <div className="care-plan-list-container">
            {/* Add the title heading */}
            {title && (
                <div className="title-common mb-1" style={{ padding: '10px 0 0px 10px' }}>
                    {title}
                </div>
            )}

            {loading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100px' }}>
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                </div>
            ) : error ? (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100px' }}>
                    <Text type="danger">{error}</Text>
                </div>
            ) : assignedCarePlans.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No care plans assigned"
                    style={{ padding: '20px 0' }}
                />
            ) : (
                <List
                    dataSource={assignedCarePlans}
                    renderItem={renderCarePlanItem}
                    style={{ maxHeight: '300px', overflowY: 'auto' }}
                />
            )}
        </div>
    );
}

export default React.memo(CarePlanList);
