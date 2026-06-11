import React from "react";
import { Button } from 'antd';
import CarePlanList from "../CarePlanList";
import CarePlanDropdown from "../CarePlanDropdown";

function TabCarePlanList(props) {
    const { 
        handleCollapsed, 
        patientId, 
        selectedTcmId, 
        selectedCarePlan, 
        setSelectedCarePlan,
        userId,
        clinicId,
        carePlanPlaceholder,
        isTabRx
    } = props;

    return (
        <>
            {/* Purple banner header */}
            <div className={`text-white align-items-center bg-secondary d-flex justify-content-between lh-lg px-2 py-2 ${isTabRx ? 'tab-rx-header' : ''}`}>
                Care Plans
                <Button type="text" className="btn p-0 btn-outline" onClick={handleCollapsed}>
                    <i className='icon-Contract fs-21 text-white p-0'></i>
                </Button>
            </div>
            
            {/* Care Plan content */}
            <div className="overflow-y-auto" style={{ height: "calc(100vh - 109px)" }}>
                <div className="p-10 pb-0">
                    <CarePlanList
                        patientId={patientId}
                        selectedTcmId={selectedTcmId}
                        readOnly={true}
                        title="Assigned Care Plans"
                        hideWhenEmpty={true}
                        onCarePlanSelect={(plan) => {
                            setSelectedCarePlan(plan);
                        }}
                    />
                    
                    <div className="mt-3">
                        <CarePlanDropdown 
                            onCarePlanSelect={(plan) => {
                                setSelectedCarePlan(plan);
                            }}
                            selectedCarePlan={selectedCarePlan}
                            patientId={patientId}
                            doctorId={userId}
                            clinicId={clinicId}
                            placeholder={carePlanPlaceholder}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

export default React.memo(TabCarePlanList);