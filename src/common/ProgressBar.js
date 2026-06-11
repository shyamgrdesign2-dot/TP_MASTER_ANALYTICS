import React, { useRef, useEffect } from 'react';

const ProgressBar = ({ progress }) => {

  const containerStyle = {
    width: '100%',
    height: '30px',
    backgroundColor: '#e0e0e0',
    borderRadius: '5px',
    overflow: 'hidden',
  };
  
  const progressStyle = {
    height: '100%',
    width: progress + "%",
    backgroundColor: '#76c7c0',
    transition: 'width 0.1s ease-in-out',
  };
  
  return (
    <div style={containerStyle}>
      <div style={progressStyle}></div>
    </div>
  );
};


export default ProgressBar;
