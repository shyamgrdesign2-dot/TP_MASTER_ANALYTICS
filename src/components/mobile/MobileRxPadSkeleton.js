import React from 'react';
import './MobileRxPadSkeleton.scss';

const MobileRxPadSkeleton = () => {
  // Render skeleton section with header and multiple text lines
  const renderSkeletonSection = (key) => (
    <div key={key} className="skeleton-section">
      <div className="skeleton-header"></div>
      <div className="skeleton-content skeleton-line-full">
      </div>
      <div className="skeleton-content skeleton-line-70">
      </div>
      <div className="skeleton-content skeleton-line-90">
      </div>
      <div className="skeleton-content skeleton-line-85">
      </div>
    </div>
  );

  return (
    <div className="mobile-rx-pad-skeleton">
      {renderSkeletonSection(1)}
      {renderSkeletonSection(2)}
      {renderSkeletonSection(3)}
      {renderSkeletonSection(4)}
      {renderSkeletonSection(5)}
    </div>
  );
};

export default MobileRxPadSkeleton;
