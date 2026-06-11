import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from '../utils/constants';
import { ASSETS } from "../assets";
const {
  syncNormal: syncNormalIcon,
  syncing: syncingIcon,
  synced: syncedIcon,
} = ASSETS.images;

const AbhaSyncButton = ({ 
  abhaContextLink, 
  abhaSync, 
  patientUniqueId, 
  caseId, 
  onSyncComplete 
}) => {
  const [currentState, setCurrentState] = useState(() => {
    if (abhaContextLink === 1) {
      return 'synced';
    }
    if (abhaContextLink === 0 && abhaSync === true) {
      return 'idle';
    }
    return null;
  });

  // Update state when props change
  useEffect(() => {
    let newState = null;
    if (abhaContextLink === 1) {
      newState = 'synced';
    } else if (abhaContextLink === 0 && abhaSync === true) {
      newState = 'idle';
    }
    setCurrentState(newState);
  }, [abhaContextLink, abhaSync]);

  const handleClick = async () => {
    if (currentState === 'synced' || currentState === 'syncing') {
      return; // Don't allow clicks when synced or already syncing
    }

    setCurrentState('syncing');

    try {
      const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
      const cleanedToken = token ? token.replace(/['"]+/g, '') : null;

      if (!cleanedToken) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.post(
        `${config.abha_api_url}/api/v1/abdm/m2/linkCareContext/generate-token`,
        {
          patientUniqueId: patientUniqueId,
          caseID: caseId,
        },
        {
          headers: {
            'Authorization': `Bearer ${cleanedToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response && response.data) {
        // On success, update state to synced
        setCurrentState('synced');
        
        // Call callback if provided
        if (onSyncComplete) {
          onSyncComplete(response.data);
        }
      } else {
        throw new Error('Failed to sync prescription');
      }
    } catch (error) {
      console.error('Error syncing prescription:', error);
      
      // Check if it's a duplicate token request error
      const errorData = error?.response?.data;
      const errorMessage = errorData?.message || '';
      const isDuplicateRequest = errorMessage.includes('Duplicate Link token request') || 
                                 errorMessage.includes('ABDM-1092');
      
      // Always revert to idle state on error
      setCurrentState('idle');
      
      if (isDuplicateRequest) {
        // For duplicate requests, show specific message
        if (onSyncComplete) {
          onSyncComplete({ 
            error: 'Please try again after sometime',
            isDuplicate: true 
          });
        }
      } else {
        // For other errors, extract error message
        const userFriendlyMessage = errorData?.message || 
                                   errorData?.error || 
                                   error?.message || 
                                   'Failed to sync prescription. Please try again.';
        
        // Call callback with error if provided
        if (onSyncComplete) {
          onSyncComplete({ error: userFriendlyMessage });
        }
      }
    }
  };

  // Don't render if conditions aren't met
  if (currentState === null) {
    return null;
  }

  const getButtonIcon = () => {
    switch (currentState) {
      case 'syncing':
        return syncingIcon;
      case 'synced':
        return syncedIcon;
      case 'idle':
      default:
        return syncNormalIcon;
    }
  };

  const isDisabled = currentState === 'syncing' || currentState === 'synced';

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      style={{
        width: '101.54762268066406px',
        height: '20px',
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.7 : 1,
      }}
    >
      <img
        src={getButtonIcon()}
        alt={
          currentState === 'syncing'
            ? 'Syncing'
            : currentState === 'synced'
            ? 'Rx Synced'
            : 'Sync RX'
        }
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </button>
  );
};

export default AbhaSyncButton;

