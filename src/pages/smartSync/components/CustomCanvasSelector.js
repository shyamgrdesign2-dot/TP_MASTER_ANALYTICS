import React, { useState } from 'react';
import { Button, Select, Typography, Radio } from 'antd';
import "./CustomCanvasSelector.scss"
import { ASSETS } from "../../../assets";
const RxPadIcon = ASSETS.images.smartPad;

const { Option } = Select;
const { Text } = Typography;

const CustomCanvasSelector = ({ templates, selectedTemplateId, onTemplateSelect, onAddEditCanvas, onUploadNew, onKnowMore }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // SCENARIO 1: NO TEMPLATES - Show simple "Add custom Rx Canvas" UI
  if (!templates || templates.length === 0) {
    return (
      <div className="prescription-box-sm p-14 mb-14 custom-canvas-selector" style={{width:"720px"}}>
        <div className="no-templates-container">
          <div className="header-section">
            <div className="left-section">
              <img className="rx-pad-icon" width="18" src={RxPadIcon} />
              <span className="title-text">
                Add custom Rx Canvas
              </span>
              <button className="know-more-btn" onClick={onKnowMore}>
                Know more
              </button>
              <span className="new-btn">New</span>
            </div>
            <button 
              className="btn add-rx-btn"
              onClick={onUploadNew}
            >
              <i className="icon-Add"></i>
              Add Rx Canvas
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCENARIO 2: TEMPLATES EXIST - Show advanced dropdown selection UI
  
  // Find selected template to show page info
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const pageCount = selectedTemplate?.uploaded_files?.length || 0;
  
  // Helper function for template selection
  const isTemplateSelected = (templateId) => {
    return templateId && templateId !== 'none';
  };

  return (
    <div style={{width:"720px"}} className="prescription-box-sm p-14 mb-14 custom-canvas-selector">
      <div className="templates-container">
        {/* Header Row */}
        <div className="header-section">
          <div className="left-section">
            <img className="rx-pad-icon" width="18" src={RxPadIcon} />
            <span className="title-text">
              Custom Canvas
            </span>
            <button className="know-more-btn" onClick={onKnowMore}>
              Know more
            </button>
          </div>
          
          {/* Template Selection Dropdown on the RIGHT */}
          <div className="dropdown-container">
            <Select
              value={selectedTemplateId || undefined}
              placeholder="Select Custom RX or Template"
              open={dropdownOpen}
              onDropdownVisibleChange={setDropdownOpen}
              onChange={(value) => {
                setDropdownOpen(false);
                if (value === 'add_edit') {
                  onAddEditCanvas();
                } else {
                  onTemplateSelect(value);
                }
              }}
              size="middle"

              dropdownRender={(menu) => (
                <div style={{ 
                  padding: "16px",
                  background: "white",
                  borderRadius: "8px"
                }}>
                  <div style={{ 
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#4B4AD5",
                    marginBottom: "12px"
                  }}>
                    Select Custom Canvas
                  </div>
                  
                  {/* Radio button style options */}
                  <div style={{ 
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}>
                    {[
                      { value: 'none', label: 'None' },
                      ...templates.map(template => ({ value: template.id, label: template.title }))
                    ].map((option) => {
                      const isSelected = (selectedTemplateId || 'none') === option.value;
                      return (
                        <div
                          key={option.value}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "10px 12px",
                            cursor: "pointer",
                            borderRadius: "8px",
                            backgroundColor: isSelected ? "#e3f2fd" : "transparent",
                            border: isSelected ? "1px solid #4B4AD5" : "1px solid transparent",
                            transition: "all 0.2s ease"
                          }}
                          onClick={() => {
                            const currentValue = selectedTemplateId || 'none';
                            if (option.value !== currentValue) {
                              onTemplateSelect(option.value);
                              setDropdownOpen(false);
                            }
                          }}
                        >
                          {/* Radio button */}
                          <div style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            border: isSelected ? "2px solid #4B4AD5" : "2px solid #d1d5db",
                            backgroundColor: isSelected ? "#4B4AD5" : "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative"
                          }}>
                            {isSelected && (
                              <div style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: "white"
                              }} />
                            )}
                          </div>
                          
                          {/* Label */}
                          <span style={{
                            color: isSelected ? "#1976d2" : "#374151",
                            fontWeight: isSelected ? "600" : "400",
                            fontSize: "14px"
                          }}>
                            {option.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Separator with "or" text */}
                  <div style={{ 
                    position: "relative",
                    marginTop: "12px",
                    marginBottom: "12px"
                  }}>
                    <div style={{
                      height: "1px",
                      backgroundColor: "#e5e7eb",
                      width: "100%"
                    }} />
                    <div style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      backgroundColor: "white",
                      padding: "0 12px",
                      color: "#9ca3af",
                      fontSize: "12px",
                      fontWeight: "400"
                    }}>
                      or
                    </div>
                  </div>
                  
                  {/* Add/Edit button */}
                  <div 
                    style={{
                      color: "#1976d2",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px",
                      cursor: "pointer",
                      borderRadius: "8px",
                      border: "1px dashed #4B4AD5",
                      backgroundColor: "#f8f9ff",
                      fontSize: "14px",
                      transition: "all 0.2s ease"
                    }}
                    onClick={() => {
                      onAddEditCanvas();
                      setDropdownOpen(false);
                    }}
                  >
                    <i className="icon-Add" style={{ 
                      fontSize: "14px", 
                      color: "#4B4AD5", 
                      fontWeight: "bold" 
                    }}></i>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#4B4AD5", 
                      fontWeight: "500" 
                    }}>Add/Edit Rx Canvas</div>
                  </div>
                </div>
              )}
            >
              {/* Dummy options for display value */}
              <Option value="none">None</Option>
              {templates.map(template => (
                <Option key={template.id} value={template.id}>
                  {template.title}
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomCanvasSelector; 