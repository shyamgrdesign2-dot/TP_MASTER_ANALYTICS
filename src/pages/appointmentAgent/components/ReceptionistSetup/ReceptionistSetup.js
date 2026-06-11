import React, { useState, useEffect, useCallback } from 'react';
import { Input, Radio } from 'antd';
import './ReceptionistSetup.scss';
import SetupPreview from "../preview/setupPreview";
import { fetchAvatars } from '../../service';
import { isMobile } from 'react-device-detect';
import { ASSETS } from "../../../../assets";
const CheckRadioIcon = ASSETS.images.checkRadio;

const ReceptionistSetup = ({ onDataChange, initialData, clinicName, triggerValidation }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [gender, setGender] = useState(initialData?.gender || 'female');
  const [selectedLook, setSelectedLook] = useState(initialData?.selectedLook || null);
  const [allAvatars, setAllAvatars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNameError, setShowNameError] = useState(false);
  const [showAvatarError, setShowAvatarError] = useState(false);

  const updateParentData = useCallback(() => {
    onDataChange && onDataChange({
      receptionistName: name,
      gender,
      avatar: selectedLook
    });
  }, [name, gender, selectedLook]);

  useEffect(() => {
    updateParentData();
  }, [updateParentData]);

  // Handle trigger validation from parent
  useEffect(() => {
    if (triggerValidation) {
      if (!name.trim()) {
        setShowNameError(true);
      }
      if (!selectedLook) {
        setShowAvatarError(true);
      }
    }
  }, [triggerValidation, name, selectedLook]);

  // Show validation errors when user tries to interact
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    if (showNameError && newName.trim().length > 0) {
      setShowNameError(false);
    }
  };

  const handleAvatarSelect = (look) => {
    setSelectedLook(look);
    if (showAvatarError) {
      setShowAvatarError(false);
    }
  };

  // Fetch avatars only once when component mounts
  useEffect(() => {
    const getAvatars = async () => {
      setLoading(true);
      try {
        const response = await fetchAvatars();
        if (response) {
          setAllAvatars(response);
          // Only set initial look if not already set from initialData
          if (!selectedLook) {
            setSelectedLook(response[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching avatars:', error);
      } finally {
        setLoading(false);
      }
    };

    getAvatars();
  }, []); // Empty dependency array - run only once

  // Filter avatars based on gender
  const receptionistLooks = allAvatars?.filter(avatar => avatar.gender === gender);

  // Set default selection when filtered avatars change
  useEffect(() => {
    if (receptionistLooks.length > 0 && !selectedLook) {
      setSelectedLook(receptionistLooks[0]);
    }
  }, [gender]); // Only run when gender changes

  const handleGenderChange = (e) => {
    const newGender = e.target.value;
    setGender(newGender);
    setSelectedLook(null); // Reset selected look when gender changes
    setShowAvatarError(false); // Reset avatar error when gender changes
  };

  return (
    <div className="receptionist-setup-container" style={{ width : isMobile ? "90%" : "70%"}}>
      <div className="setup-form">
        <div className="form-section">
          <label>
            Name Your AI Receptionist <span className="required">*</span>
          </label>
          <Input
            value={name}
            onChange={handleNameChange}
            placeholder="Enter name"
            maxLength={12}
            className={`name-input ${showNameError ? 'error-input' : ''}`}
            suffix={<span className="char-count">{`${name.length}/12`}</span>}
            onBlur={() => {
              if (!name.trim()) {
                setShowNameError(true);
              }
            }}
          />
          {showNameError && (
            <div className="error-message">Please enter a receptionist name</div>
          )}
        </div>

        <div className="form-section">
          <label>Select gender for your AI receptionist</label>
          <Radio.Group
            value={gender}
            defaultValue="female"
            onChange={handleGenderChange}
            className="gender-selection"
          >
            <Radio value="female">Female</Radio>
            <Radio value="male">Male</Radio>
          </Radio.Group>
        </div>

        <div className="form-section">
          <label>
            Choose your receptionist's look <span className="required">*</span>
          </label>
          <div className={`looks-grid ${showAvatarError ? 'error-grid' : ''}`}>
            {loading ? (
              <div className="loading-spinner">Loading avatars...</div>
            ) : (
              receptionistLooks.map((look) => (
                <div
                  key={look._id}
                  className={`look-option ${selectedLook?._id === look._id ? 'selected' : ''}`}
                  onClick={() => handleAvatarSelect(look)}
                >
                  <img src={look.lookUrl} alt={`${look.gender} receptionist with ${look.voice} voice`} />
                  {selectedLook?._id === look._id && (
                    <div className='selected-check'>
                      <img src={CheckRadioIcon}/>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {showAvatarError && (
            <div className="error-message">Please select a receptionist avatar</div>
          )}
        </div>
      </div>
      <div style={{width :"40%"}}>
        <SetupPreview 
          name={name} 
          avatarUrl={selectedLook?.lookUrl}
          voice={selectedLook?.voice}
          clinicName={(initialData?.clinicName || initialData?.clinicData?.hm_name)}
          logo={initialData?.logo}
          useUploadLogo={initialData?.useUploadLogo}
        />
      </div>
    </div>
  );
};

export default ReceptionistSetup;