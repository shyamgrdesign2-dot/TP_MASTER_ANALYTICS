import React from 'react';
import { Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import './PageBreakComponent.scss';

const PageBreakComponent = ({ onRemove, isDragging = false }) => {
  return (
    <div 
      className={`page-breaker-component ${isDragging ? 'dragging' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '38px',
        transition: 'all 0.3s ease',
        ...(isDragging && {
          opacity: 0.7,
          transform: 'rotate(2deg)',
        })
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ 
          fontWeight: '500', 
          color: '#1890ff',
          fontSize: '14px'
        }}>
          -------- Page Breaker ----------
        </span>
      </div>
    </div>
  );
};

export default PageBreakComponent;
