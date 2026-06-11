import React, { useState, useMemo } from 'react';
import { Drawer, Button, Tabs } from 'antd';
import moment from 'moment';

import './MobilePreviousPregnancyOverview.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

const { TabPane } = Tabs;

// Status badge component
const StatusBadge = ({ status, type = 'default' }) => {
  const getStatusStyle = () => {
    if (type === 'examination') return 'status-badge examination';
    if (status === 'Completed' || status === 'Given') return 'status-badge completed';
    return 'status-badge pending';
  };
  
  return <span className={getStatusStyle()}>{status}</span>;
};

/**
 * Mobile component for viewing Previous Pregnancy details (Read-only)
 */
function MobilePreviousPregnancyOverview({
  visible,
  onClose,
  pregnancyData
}) {
  const [activeTab, setActiveTab] = useState('overview');

  // Extract pregnancy info
  const pregnancyInfo = useMemo(() => {
    if (!pregnancyData) return null;
    
    const { outcome, gravidity, gravidaNumber, termLength } = pregnancyData;
    const gravidaNum = gravidity || gravidaNumber || 'N/A';
    const displayOutcome = outcome === 'Abortion' ? 'Miscarriage' : outcome;
    
    return {
      title: `G${gravidaNum}, ${displayOutcome}${termLength ? `, ${termLength}` : ''}`,
      ...pregnancyData
    };
  }, [pregnancyData]);

  // Format examination for display
  const formatExamination = (exam) => {
    const items = [];
    
    if (exam.date) items.push({ label: 'Date', value: moment(exam.date).format('DD MMM YYYY') });
    if (exam.pallor) items.push({ label: 'Pallor', value: exam.pallor });
    if (exam.oedema) items.push({ label: 'Oedema', value: exam.oedema });
    if (exam.mothersHeight) items.push({ label: 'Height', value: `${exam.mothersHeight} cm` });
    if (exam.mothersWeight) items.push({ label: 'Weight', value: `${exam.mothersWeight} kg` });
    if (exam.mothersBMI) items.push({ label: 'BMI', value: exam.mothersBMI });
    if (exam.systolic || exam.diastolic) {
      items.push({ label: 'BP', value: `${exam.systolic || '-'}/${exam.diastolic || '-'} mmHg` });
    }
    if (exam.heightOfFundus) {
      items.push({ label: 'Fundus Height', value: `${exam.heightOfFundus} ${exam.heightOfFundusUnit || 'weeks'}` });
    }
    if (exam.presentation) items.push({ label: 'Presentation', value: exam.presentation });
    if (exam.liquor) items.push({ label: 'Liquor', value: exam.liquor });
    if (exam.foetalHeartRate) items.push({ label: 'FHR', value: `${exam.foetalHeartRate} bpm` });
    if (exam.notes) items.push({ label: 'Notes', value: exam.notes });
    
    return items;
  };

  // Render Overview Tab
  const renderOverview = () => {
    if (!pregnancyInfo) return null;
    
    const {
      outcome, dateOfDelivery, ageOfDelivery, deliveryMode, gender,
      babysWeight, remarks, location, gestationPeriod, typeOfAbortion,
      modeOfManagement, termLength, typeOfDelivery
    } = pregnancyInfo;

    return (
      <div className="overview-content">
        <div className="info-section">
          <h3 className="section-title">Pregnancy Details</h3>
          
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Outcome</span>
              <span className="info-value">{outcome === 'Abortion' ? 'Miscarriage' : outcome}</span>
            </div>
            
            {termLength && (
              <div className="info-item">
                <span className="info-label">Term</span>
                <span className="info-value">{termLength}</span>
              </div>
            )}
            
            {gestationPeriod && (
              <div className="info-item">
                <span className="info-label">Gestation</span>
                <span className="info-value">{gestationPeriod} weeks</span>
              </div>
            )}
          </div>
        </div>

        {(outcome === 'Live' || outcome === 'Still birth') && (
          <div className="info-section">
            <h3 className="section-title">Delivery Details</h3>
            
            <div className="info-grid">
              {deliveryMode && (
                <div className="info-item">
                  <span className="info-label">Delivery Mode</span>
                  <span className="info-value">{deliveryMode}</span>
                </div>
              )}
              
              {typeOfDelivery && (
                <div className="info-item">
                  <span className="info-label">Type</span>
                  <span className="info-value">{typeOfDelivery}</span>
                </div>
              )}
              
              {(dateOfDelivery || ageOfDelivery) && (
                <div className="info-item">
                  <span className="info-label">Date/Age</span>
                  <span className="info-value">
                    {dateOfDelivery ? moment(dateOfDelivery).format('DD MMM YYYY') : ageOfDelivery}
                  </span>
                </div>
              )}
              
              {gender && (
                <div className="info-item">
                  <span className="info-label">Gender</span>
                  <span className="info-value">{gender}</span>
                </div>
              )}
              
              {babysWeight && (
                <div className="info-item">
                  <span className="info-label">Baby's Weight</span>
                  <span className="info-value">{babysWeight} kg</span>
                </div>
              )}
            </div>
          </div>
        )}

        {outcome === 'Ectopic' && (
          <div className="info-section">
            <h3 className="section-title">Ectopic Details</h3>
            
            <div className="info-grid">
              {location && (
                <div className="info-item">
                  <span className="info-label">Location</span>
                  <span className="info-value">{location}</span>
                </div>
              )}
              
              {modeOfManagement && (
                <div className="info-item">
                  <span className="info-label">Management</span>
                  <span className="info-value">{modeOfManagement}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(outcome === 'Abortion' || outcome === 'Miscarriage') && (
          <div className="info-section">
            <h3 className="section-title">Miscarriage Details</h3>
            
            <div className="info-grid">
              {typeOfAbortion && (
                <div className="info-item">
                  <span className="info-label">Type</span>
                  <span className="info-value">{typeOfAbortion}</span>
                </div>
              )}
              
              {modeOfManagement && (
                <div className="info-item">
                  <span className="info-label">Management</span>
                  <span className="info-value">{modeOfManagement}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {remarks && (
          <div className="info-section">
            <h3 className="section-title">Remarks</h3>
            <p className="remarks-text">{remarks}</p>
          </div>
        )}
      </div>
    );
  };

  // Render Examinations Tab
  const renderExaminations = () => {
    const examinations = pregnancyInfo?.examinationHistory || [];
    
    if (examinations.length === 0) {
      return (
        <div className="empty-state">
          <p>No examination records for this pregnancy</p>
        </div>
      );
    }

    return (
      <div className="examinations-content">
        {examinations.map((exam, index) => (
          <div key={index} className="exam-card">
            <div className="exam-header">
              <span className="exam-date">
                {exam.date ? moment(exam.date).format('DD MMM YYYY') : `Exam ${index + 1}`}
              </span>
              <StatusBadge status="Recorded" type="examination" />
            </div>
            <div className="exam-body">
              {formatExamination(exam).map((item, idx) => (
                <div key={idx} className="exam-item">
                  <span className="exam-label">{item.label}</span>
                  <span className="exam-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render ANC History Tab
  const renderAncHistory = () => {
    const ancHistory = pregnancyInfo?.ancHistory || [];
    
    if (ancHistory.length === 0) {
      return (
        <div className="empty-state">
          <p>No ANC records for this pregnancy</p>
        </div>
      );
    }

    return (
      <div className="anc-content">
        {ancHistory.map((item, index) => (
          <div key={index} className="anc-card">
            <div className="anc-header">
              <span className="anc-name">{item.master?.name || 'Test'}</span>
              <StatusBadge status={item.status || 'Due'} />
            </div>
            <div className="anc-body">
              <div className="anc-item">
                <span className="anc-label">Week Range</span>
                <span className="anc-value">{item.weekRange?.start} - {item.weekRange?.end} weeks</span>
              </div>
              {item.dueDate && (
                <div className="anc-item">
                  <span className="anc-label">Due Date</span>
                  <span className="anc-value">{moment(item.dueDate).format('DD MMM YYYY')}</span>
                </div>
              )}
              {item.notes && (
                <div className="anc-item full-width">
                  <span className="anc-label">Notes</span>
                  <span className="anc-value">{item.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render Immunisation History Tab
  const renderImmunisationHistory = () => {
    const immunisationHistory = pregnancyInfo?.immunisationHistory || [];
    
    if (immunisationHistory.length === 0) {
      return (
        <div className="empty-state">
          <p>No immunisation records for this pregnancy</p>
        </div>
      );
    }

    return (
      <div className="immunisation-content">
        {immunisationHistory.map((item, index) => (
          <div key={index} className={`immunisation-card ${item.status === 'Given' ? 'given' : ''}`}>
            <div className="immunisation-header">
              <span className="immunisation-name">{item.master?.name || 'Vaccine'}</span>
              <StatusBadge status={item.status || 'Due'} />
            </div>
            <div className="immunisation-body">
              {item.givenDate && (
                <div className="immunisation-item">
                  <span className="immunisation-label">Given Date</span>
                  <span className="immunisation-value">{moment(item.givenDate).format('DD MMM YYYY')}</span>
                </div>
              )}
              {item.notes && (
                <div className="immunisation-item full-width">
                  <span className="immunisation-label">Notes</span>
                  <span className="immunisation-value">{item.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Calculate tab counts
  const examCount = pregnancyInfo?.examinationHistory?.length || 0;
  const ancCount = pregnancyInfo?.ancHistory?.length || 0;
  const immunCount = pregnancyInfo?.immunisationHistory?.length || 0;

  return (
    <Drawer
      placement="bottom"
      open={visible}
      onClose={onClose}
      closable={false}
      height="90vh"
      className="mobile-previous-pregnancy-overview"
      destroyOnClose
    >
      <div className="overview-container">
        {/* Header */}
        <div className="overview-header">
          <div className="header-content">
            <h2 className="header-title">Previous Pregnancy</h2>
            {pregnancyInfo && (
              <span className="header-subtitle">{pregnancyInfo.title}</span>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        {/* Read-only banner */}
        <div className="readonly-banner">
          <i className="icon-info" />
          <span>This is a read-only view of a previous pregnancy</span>
        </div>

        {/* Tabs */}
        <div className="overview-tabs">
          <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
            <TabPane tab="Overview" key="overview" />
            <TabPane tab={`Exams (${examCount})`} key="examinations" />
            <TabPane tab={`ANC (${ancCount})`} key="anc" />
            <TabPane tab={`Vaccines (${immunCount})`} key="immunisation" />
          </Tabs>
        </div>

        {/* Body */}
        <div className="overview-body">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'examinations' && renderExaminations()}
          {activeTab === 'anc' && renderAncHistory()}
          {activeTab === 'immunisation' && renderImmunisationHistory()}
        </div>

        {/* Footer */}
        <div className="overview-footer">
          <Button
            type="primary"
            block
            className="close-btn-footer"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export default MobilePreviousPregnancyOverview;
