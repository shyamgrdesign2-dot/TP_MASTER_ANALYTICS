import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import CertificateDetails from '../../../../components/medical_certificate/CertificateDetails';
import MobileCertificateTemplateSelector from './MobileCertificateTemplateSelector';
import MobileCreateCertificate from './MobileCreateCertificate';
import './CertificateTab.scss';

function CertificateTab({ patient_data }) {
  const { patientCertificateList } = useSelector((state) => state.doctors);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showCreateCertificate, setShowCreateCertificate] = useState(false);
  const [selectedCertificateData, setSelectedCertificateData] = useState(null);

  const handleFABClick = () => {
    setShowTemplateSelector(true);
  };

  const handleCloseTemplateSelector = () => {
    setShowTemplateSelector(false);
  };

  const handleTemplateSelect = (templateData) => {
    setSelectedCertificateData(templateData);
    setShowTemplateSelector(false);
    setShowCreateCertificate(true);
  };

  const handleCustomCertificateClick = () => {
    setSelectedCertificateData(null);
    setShowTemplateSelector(false);
    setShowCreateCertificate(true);
  };

  const handleCloseCreateCertificate = () => {
    setShowCreateCertificate(false);
    setSelectedCertificateData(null);
  };

  const handleCreateCertificateFromEmpty = () => {
    setShowTemplateSelector(true);
  };

  return (
    <div className="certificate-tab">
      <CertificateDetails 
        patient_data={patient_data} 
        onCreateCertificateClick={handleCreateCertificateFromEmpty}
      />
      {patientCertificateList?.length > 0 && (
        <button
          className="certificate-fab"
          onClick={handleFABClick}
          type="button"
          aria-label="Create Certificate"
        />
      )}
      <MobileCertificateTemplateSelector
        visible={showTemplateSelector}
        onClose={handleCloseTemplateSelector}
        patient_data={patient_data}
        replace={false}
        onTemplateSelect={handleTemplateSelect}
        onCustomCertificateClick={handleCustomCertificateClick}
      />
      <MobileCreateCertificate
        visible={showCreateCertificate}
        onClose={handleCloseCreateCertificate}
        patient_data={patient_data}
        certificate_data={selectedCertificateData}
      />
    </div>
  );
}

export default CertificateTab;
