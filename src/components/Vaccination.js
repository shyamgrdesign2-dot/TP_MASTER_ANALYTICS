import React from 'react';
import Card from 'react-bootstrap/Card';
import { ASSETS } from "../assets";
const {
  vaccination: VaccinationIcon,
  arrowBoxRight: arrowright,
} = ASSETS.images;

function Vaccination() {

    return (
        <div className="appointment-wrap PatientDetailswrap m-0">
            <Card className=''>
                <Card.Header className='bg-white py-3'>
                    <div className='d-flex align-items-center justify-content-between'>
                        <div>
                            <img src={VaccinationIcon} alt="vitals" className='me-3' />
                            Vaccination
                        </div>
                        <a>
                            <img src={arrowright} alt="vitals" />
                        </a>
                    </div>
                </Card.Header>
                <Card.Body className='cardbody-data'>
                    <div className='mb-2 d-flex align-items-center justify-content-between'>
                        <div>
                            <span>Upcoming</span> : <label> Influenza dose 2</label>
                        </div>
                        <div className='highlighted'>Due in 3 Days</div>
                    </div>
                </Card.Body>
            </Card>
        </div>
    )
}

export default React.memo(Vaccination)