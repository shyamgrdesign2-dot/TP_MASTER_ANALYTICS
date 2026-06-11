import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import { useFeatureIsOn } from '@growthbook/growthbook-react';
import CarePlanList from './CarePlanList';

import { getCarePlanAssignments } from '../pages/smartSync/services/carePlanService';
import { GB_CARE_PLAN } from '../utils/constants';
import { ASSETS } from "../assets";
const carePlanIcon = ASSETS.images.carePlanActive;

const CarePlanBox = ({ patientId, selectedTcmId, readOnly = true }) => {
  const [carePlanCount, setCarePlanCount] = useState(0);

  const isCarePlanEnabled = useFeatureIsOn(GB_CARE_PLAN);

  useEffect(() => {
    const fetchCarePlanCount = async () => {
      if (!patientId || !isCarePlanEnabled) return;
      
      try {
        const response = await getCarePlanAssignments(patientId);
        const plans = Array.isArray(response) ? response : [];
        setCarePlanCount(plans.length);
      } catch (error) {
        console.error('Error fetching care plan count:', error);
        setCarePlanCount(0);
      }
    };

    fetchCarePlanCount();
  }, [patientId, isCarePlanEnabled]); // Add isCarePlanEnabled to dependencies

  // Don't render anything if feature is disabled
  if (!isCarePlanEnabled) {
    return null;
  }

  return (
    <div className="appointment-wrap PatientDetailswrap m-0">
      <Card>
        <Card.Header className='bg-white py-3'>
          <div className='d-flex align-items-center justify-content-between'>
            <div className='d-flex align-items-center'>
              <img 
                src={carePlanIcon} 
                alt="Care Plans" 
                className='me-3'
                style={{ width: '20px', height: '20px' }}
              />
              Assigned Care Plans ({carePlanCount})
            </div>
          </div>
        </Card.Header>
        <div className='px-3 pt-2'>
          <CarePlanList
            patientId={patientId}
            selectedTcmId={selectedTcmId}
            readOnly={readOnly}
            title="" // Empty title since count is now in header
          />
        </div>
      </Card>
    </div>
  );
};

export default CarePlanBox;