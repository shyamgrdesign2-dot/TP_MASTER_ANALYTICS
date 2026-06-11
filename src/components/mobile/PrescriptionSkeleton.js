import React from 'react';
import './PrescriptionSkeleton.scss';

const PrescriptionSkeleton = () => {
  // Render skeleton section with header and multiple text lines
  const renderSkeletonSection = (key) => (
    <div key={key} className="prescription-skeleton-section">
      <div className="prescription-skeleton-header"></div>
      <div className="prescription-skeleton-content prescription-skeleton-line-full"></div>
      <div className="prescription-skeleton-content prescription-skeleton-line-90"></div>
      <div className="prescription-skeleton-content prescription-skeleton-line-full"></div>
      <div className="prescription-skeleton-content prescription-skeleton-line-85"></div>
    </div>
  );

  return (
    <div className="prescription-skeleton">
      {/* Large content block */}
      <div className="prescription-skeleton-large-block"></div>
      
      {/* Text placeholder sections */}
      {renderSkeletonSection(1)}
      {renderSkeletonSection(2)}
      {renderSkeletonSection(3)}
      {renderSkeletonSection(4)}
    </div>
  );
};

export default PrescriptionSkeleton;
