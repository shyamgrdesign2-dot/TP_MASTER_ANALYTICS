import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AutoComplete, Input, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';
import styles from './ConsultationDrawer.module.css';

import {
  searchInvestigation,
  getFrequentlySearchedInvestigation
} from "../redux/investigationSlice";
import { removeBeforeWhiteSpace, getHmTypeIndicator, getClinic } from '../utils/utils';
import ApiInvestigation from '../api/services/ApiInvestigation';
import { env } from '../EnvironmentConfig';
import { useFeatureIsOn } from '@growthbook/growthbook-react';
import { GB_APOLLO_DISABLE_FEATURE, GB_ZYDUS_USER, GB_MED_INVESTIGATION } from '../utils/constants';
import { getDecodedToken } from '../utils/localStorage';
import CommonModal from '../common/CommonModal';
import config from '../config';
import { useLocation } from 'react-router-dom';
import { useGrounding } from '../hooks/useGrounding';
import { INVESTIGATION_TITLE } from '../utils/constants';
import { ASSETS } from "../assets";
const {
  lab: investigationIcon,
  groundingIndicator: groundingIndicatorBg,
} = ASSETS.images;

const LabInvestigationTable = ({
  labInvestigation = [],
  onUpdate,
  isProcessing = false,
  isMedInvestigationFeatureOn: isMedInvestigationFeatureOnProp,
}) => {
  const dispatch = useDispatch();
  const { profile } = useSelector(
    (state) => state.doctors
  );
  const { state } = useLocation();
  const { patient_data } = state || {};
  const { parentOptionsList, loading } = useSelector((state) => state.investigation);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [parentSearchOptions, setParentSearchOptions] = useState([]);
  const [editingCell, setEditingCell] = useState(null); // { itemId: '...', field: 'name' }                                                                     
  const [editValue, setEditValue] = useState('');
  const [originalEditValue, setOriginalEditValue] = useState(''); // Track original value to detect if user edited
  const [fuzzySearchResults, setFuzzySearchResults] = useState([]); // Store fuzzy search results
  const [editingRow, setEditingRow] = useState(null); // itemId when entire row is being edited (tablet view)
  const [rowEditValues, setRowEditValues] = useState({}); // Store edit values for all fields in a row
  const hasHadInvestigationsRef = useRef(false); // Show "No investigations found" only after user had items and deleted them
  const [isTablet, setIsTablet] = useState(false);
  const [showNonZydusWarning, setShowNonZydusWarning] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [dontShowZydusWarning, setDontShowZydusWarning] = useState(() => {
    return localStorage.getItem('dontShowZydusWarning') === 'true';
  });

  const isMedInvestigationOnFromGB = useFeatureIsOn(GB_MED_INVESTIGATION);
  const isMedInvestigationFeatureOn = isMedInvestigationFeatureOnProp ?? isMedInvestigationOnFromGB;
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const decodedToken = getDecodedToken();
  const tokenData = decodedToken?.result;

  const isApolloHosBusinessIdAccessableFromGB = useFeatureIsOn(
    GB_APOLLO_DISABLE_FEATURE
  );
  const { hospital_business_id } = tokenData || {};
  const isApollo = config.APOLLO_BUSINESS_IDS.includes(hospital_business_id);
  const isGroundingAccessable = useGrounding();
  const isGroundingAccessableForZydus =
    tokenData?.hospital_business_id == env.zydus_business_id &&
    isZydusUserAccessableFromGB;
  
  // Detect tablet view (iPad mini: 768-1024px, iPad Air: 1025-1180px, iPad Pro: 1181-1366px)
  useEffect(() => {
    const checkTablet = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth <= 1366);
    };
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  useEffect(() => {
    const data = [];
    
    // Check if we should show fuzzy search results (user clicked but didn't edit)
    // Make the condition more explicit and defensive
    const hasFuzzyResults = fuzzySearchResults && Array.isArray(fuzzySearchResults) && fuzzySearchResults.length > 0;
    const hasOriginalValue = originalEditValue && originalEditValue.trim().length > 0;
    const queryMatchesOriginal = searchQuery.trim() === originalEditValue.trim();
    const showFuzzyResults = hasFuzzyResults && hasOriginalValue && queryMatchesOriginal;
    
    if (showFuzzyResults) {
      // ONLY show fuzzy search results - don't include parentOptionsList or any other options
      // Clear data array to ensure no stale data
      const fuzzyData = [];
      fuzzySearchResults.forEach((investigation) => {
        if (investigation && investigation.investigation_name) {
          fuzzyData.push({
            key: JSON.stringify({ ...investigation, unique_id: uuidv4() }),
            value: investigation.investigation_name,
            label: (
              <div>
                {investigation.investigation_name}{' '}
                {(investigation?.hm_type === 1 || investigation?.hm_type === 2) && investigation?.um_id === 0 && (
                  <span
                    className="align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-circle text-white"
                    style={{ 
                      width: 18, 
                      height: 18, 
                      backgroundImage: `url(${groundingIndicatorBg})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  >
                    {getHmTypeIndicator(investigation)}
                  </span>
                )}
              </div>
            ),
          });
        }
      });
      // Set ONLY fuzzy results - return immediately to prevent any other data from being added
      setParentSearchOptions(fuzzyData);
      return;
    }
    
    // If not showing fuzzy results, show regular search results from parentOptionsList
    if (parentOptionsList && Array.isArray(parentOptionsList)) {
      parentOptionsList.forEach((investigation) => {
        if (investigation && investigation.investigation_name) {
          data.push({
            key: JSON.stringify({ ...investigation, unique_id: uuidv4() }),
            value: investigation.investigation_name,
            label: (
              <div>
                {investigation.investigation_name}{' '}
                {(investigation?.hm_type === 1 || investigation?.hm_type === 2) && investigation?.um_id === 0 && (
                  <span
                    className="align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-circle text-white"
                    style={{ 
                      width: 18, 
                      height: 18, 
                      backgroundImage: `url(${groundingIndicatorBg})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  >
                    {getHmTypeIndicator(investigation)}
                  </span>
                )}
              </div>
            ),
          });
        }
      });
    }

    // Only show "FREQUENTLY USED" or "Add Custom" when not showing fuzzy results
    if (!showFuzzyResults) {
      if (searchQuery.length === 0) {
        data.unshift({
          key: -1,
          label: (
            <>
              <div>FREQUENTLY USED</div>
            </>
          ),
        });
      } else {
        searchQuery &&
          parentOptionsList &&
          parentOptionsList.findIndex(
            (e) =>
              e.investigation_name?.toLowerCase()?.trim() ===
              searchQuery?.toLowerCase()?.trim()
          ) === -1 && tokenData?.hospital_business_id != env.zydus_business_id && !isZydusUserAccessableFromGB && !isApolloHosBusinessIdAccessableFromGB &&
          data.push({
            key: JSON.stringify({
              unique_id: uuidv4(),
              change: 1,
              investigation_name: searchQuery,
            }),
            value: searchQuery,
            label: (
              <>
                <div>
                  {searchQuery}
                  <i className="icon-Add mx-1 text-primary fs-6"></i>{' '}
                  <span className="fw-medium text-decoration-underline text-primary">
                    {' '}
                    Add Custom
                  </span>
                </div>
              </>
            ),
          });
      }
    }
    setParentSearchOptions(data);
  }, [parentOptionsList, searchQuery, fuzzySearchResults, originalEditValue]);

  useEffect(() => {
    // If searchQuery is empty, call getFrequentlySearchedInvestigation
    if (!searchQuery || searchQuery.trim().length === 0) {
      setFuzzySearchResults([]);
      dispatch(getFrequentlySearchedInvestigation());
      return;
    }

    // If searchQuery matches originalEditValue, user clicked but didn't edit
    // Fuzzy search already called in handleCellClick, don't call searchInvestigation
    if (originalEditValue && searchQuery.trim() === originalEditValue.trim()) {
      // User clicked on complete investigation name but didn't edit - fuzzy search already called
      return;
    }

    // User is editing (typing/changing) - call searchInvestigation
    setFuzzySearchResults([]);
    const timeOutId = setTimeout(() => {
      dispatch(
        searchInvestigation({ searchQuery: searchQuery, type: "parent" })
      );
    }, 500);
    return () => {
      clearTimeout(timeOutId);
    };
  }, [searchQuery, originalEditValue, dispatch]);

  useEffect(() => {
    const needsIdUpdate = labInvestigation.some(item => !item.id);
    if (needsIdUpdate) {
      const updatedInvestigations = labInvestigation.map(item => ({
        ...item,
        id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }));
      onUpdate(updatedInvestigations);
    }
  }, [labInvestigation, onUpdate]);

  const onSearchParent = useCallback(
    (query) => {
      const cleanedQuery = removeBeforeWhiteSpace(query);
      setSearchQuery(cleanedQuery);
    },
    []
  );

  // Helper function to add a new investigation
  const addNewInvestigation = useCallback((value, option) => {
    try {
      let investigation = null;
      if (option?.key && typeof option.key === 'string') {
        investigation = JSON.parse(option.key);
      }
      const investigationName = investigation?.investigation_name || value;
      const newInvestigation = {
        id: Date.now().toString(),
        name: investigationName,
        notes: '',
        lineItem: investigationName,
        hm_type: investigation?.hm_type,
        um_id: investigation?.um_id,
      };
      
      // Add metadata if available
      if (investigation) {
        newInvestigation.metadata = {
          ...investigation,
          selectedValue: investigationName,
        };
        // Preserve hm_type and um_id at top level for API compatibility
        if (investigation.hm_type !== undefined) {
          newInvestigation.hm_type = investigation.hm_type;
        }
        if (investigation.um_id !== undefined) {
          newInvestigation.um_id = investigation.um_id;
        }
      }
      
      const updatedInvestigations = [...labInvestigation, newInvestigation];
      onUpdate(updatedInvestigations);
      setSearchQuery('');
    } catch (error) {
      const newInvestigation = {
        id: Date.now().toString(),
        name: value,
        notes: '',
        lineItem: value,
      };
      const updatedInvestigations = [...labInvestigation, newInvestigation];
      onUpdate(updatedInvestigations);
      setSearchQuery('');
    }
  }, [labInvestigation, onUpdate]);

  const onSelectParent = useCallback(
    (value, option) => {
      try {
        if (!option?.key || option.key === -1 || option.key === -2) {
          return;
        }
        const investigation = JSON.parse(option.key);
        
        // Check if it's a custom investigation (change === 1)
        if (investigation.change === 1) {
          addNewInvestigation(value, option);
          return;
        }
        
        const isZydusInvestigation = ((investigation?.hm_type == 1 || investigation?.hm_type == 2) && investigation?.um_id === 0);
        
        if (
          isGroundingAccessableForZydus &&
          !isZydusInvestigation &&
          !dontShowZydusWarning
        ) {
          setPendingSelection({
            value,
            option,
            isNewInvestigation: true, // Flag to indicate this is for adding new investigation
          });
          setShowNonZydusWarning(true);
        } else {
          addNewInvestigation(value, option);
        }
      } catch (error) {
        // If parsing fails, just add the investigation without warning
        addNewInvestigation(value, option);
      }
    },
    [isGroundingAccessableForZydus, dontShowZydusWarning, addNewInvestigation]
  );

  const handleCellClick = async (itemId, field, currentValue) => {
    setEditingCell({ itemId, field });
    const value = currentValue || '';
    setEditValue(value);
    // Set originalEditValue first to prevent useEffect from calling searchInvestigation
    setOriginalEditValue(value); // Store original value to track if user edits
    
    if (field === 'name') {
      if (!isGroundingAccessable) {
        setFuzzySearchResults([]);
        if (value && value.trim().length > 0) {
          setSearchQuery(value);
        } else {
          setSearchQuery('');
          setOriginalEditValue('');
          dispatch(getFrequentlySearchedInvestigation());
        }
        return;
      }

      // If clicking on name field with existing value, call fuzzy search
      if (value && value.trim().length > 0) {
        setFuzzySearchResults([]); // Clear previous fuzzy results
        // Set searchQuery after setting originalEditValue to prevent triggering searchInvestigation
        setSearchQuery(value);
        try {
          const result = await ApiInvestigation.getFuzzySearch(value, 10);
          // Handle different possible response structures
          const fuzzyData = result || [];
          if (Array.isArray(fuzzyData) && fuzzyData.length > 0) {
            setFuzzySearchResults(fuzzyData);
          } else if (fuzzyData && !Array.isArray(fuzzyData)) {
            // If it's a single object, wrap it in an array
            setFuzzySearchResults([fuzzyData]);
          } else {
            setFuzzySearchResults([]);
          }
        } catch (error) {
          console.error('Error in fuzzy search:', error);
          setFuzzySearchResults([]);
          // Fallback to frequently searched investigations
          dispatch(getFrequentlySearchedInvestigation());
        }
      } else {
        // Empty name field - load frequently searched investigations
        setSearchQuery('');
        setFuzzySearchResults([]);
        setOriginalEditValue('');
        dispatch(getFrequentlySearchedInvestigation());
      }
    }
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    
    const { itemId, field } = editingCell;
    const updatedInvestigations = labInvestigation.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: editValue };
        updated.lineItem = updated.name + (updated.notes ? ` (${updated.notes})` : '');
        return updated;
          }
      return item;
    });
    
    onUpdate(updatedInvestigations);
    setEditingCell(null);
    setEditValue('');
    setOriginalEditValue('');
    setFuzzySearchResults([]);
  };

  // Handle selecting an investigation from autocomplete within the name cell
  const handleNameSelect = useCallback((itemId, value, option, isTabletMode) => {
    try {
      let investigationData = null;
      let investigationName = value;
      
      // Parse the option data
      if (option?.key && typeof option.key === 'string') {
        try {
          investigationData = JSON.parse(option.key);
          // Check if it's a custom investigation (change === 1)
          if (investigationData.change === 1) {
            investigationName = investigationData.investigation_name || value;
          } else {
            investigationName = investigationData.investigation_name || value;
          }
        } catch (parseError) {
          console.error('Error parsing investigation data:', parseError);
          investigationName = value;
        }
      }
      
      // Update investigations with new name and metadata
      const updatedInvestigations = labInvestigation.map((item) => {
        if (item.id === itemId) {
          const updated = {
            ...item, // Preserve all existing properties
            name: investigationName,
          };
          
          // Add metadata if available
          if (investigationData) {
            updated.metadata = {
              ...investigationData,
              selectedValue: investigationName,
            };
            // Preserve hm_type and um_id at top level for API compatibility
            if (investigationData.hm_type !== undefined) {
              updated.hm_type = investigationData.hm_type;
            }
            if (investigationData.um_id !== undefined) {
              updated.um_id = investigationData.um_id;
            }
          }
          
          // Recalculate lineItem
          updated.lineItem = updated.name + (updated.notes ? ` (${updated.notes})` : '');
          return updated;
        }
        return item;
      });
      
      // Update the parent state with the new name and metadata
      onUpdate(updatedInvestigations);
      
      if (isTabletMode) {
        // For tablet mode, update rowEditValues
        setRowEditValues(prev => ({
          ...prev,
          name: investigationName,
        }));
      } else {
        // For web mode: update editValue and clear editing state after autocomplete selection
        setEditValue(investigationName);
        // Clear editing state after a short delay to allow UI to update
        const currentItemId = itemId;
        setTimeout(() => {
          setEditingCell((current) => {
            // Only clear if we're still editing the same cell
            if (current?.itemId === currentItemId && current?.field === 'name') {
              setEditValue('');
              return null;
            }
            return current;
          });
        }, 100);
      }
      setSearchQuery('');
    } catch (e) {
      console.error('Error selecting investigation:', e);
      // Fallback: update with just the value
      const updatedInvestigations = labInvestigation.map((item) => {
        if (item.id === itemId) {
          const updated = {
            ...item,
            name: value,
          };
          updated.lineItem = updated.name + (updated.notes ? ` (${updated.notes})` : '');
          return updated;
        }
        return item;
      });
      onUpdate(updatedInvestigations);
      if (!isTabletMode) {
        setEditValue(value);
        // Clear editing state after a short delay for fallback case
        const currentItemId = itemId;
        setTimeout(() => {
          setEditingCell((current) => {
            if (current?.itemId === currentItemId && current?.field === 'name') {
              setEditValue('');
              return null;
            }
            return current;
          });
        }, 100);
      }
      setSearchQuery('');
    }
  }, [labInvestigation, onUpdate]);

  const handleInvestigationSelection = useCallback((itemId, value, option, isTabletMode) => {
    // Don't select header items or invalid options
    if (option?.key === -1 || option?.key === -2 || !option?.key) {
      return;
    }
    
    try {
      let investigationData = null;
      if (option?.key && typeof option.key === 'string') {
        investigationData = JSON.parse(option.key);
      }
      
      // Check if it's a custom investigation (change === 1)
      if (investigationData && investigationData.change === 1) {
        handleNameSelect(itemId, value, option, isTabletMode);
        return;
      }
      
      const isZydusInvestigation = ((investigationData?.hm_type == 1 || investigationData?.hm_type == 2) && investigationData?.um_id === 0);
      
      if (
        isGroundingAccessableForZydus &&
        !isZydusInvestigation &&
        !dontShowZydusWarning
      ) {
        setPendingSelection({
          itemId,
          value,
          option,
          isTabletMode,
        });
        setShowNonZydusWarning(true);
      } else {
        // Extract investigation name immediately
        let investigationName = value;
        if (investigationData) {
          investigationName = investigationData?.investigation_name || value;
        }
        
        // Set the value in state immediately so AutoComplete reflects it
        if (isTabletMode) {
          setRowEditValues(prev => ({
            ...prev,
            name: investigationName,
          }));
        } else {
          setEditValue(investigationName);
        }
        
        // Then update the investigation data
        handleNameSelect(itemId, value, option, isTabletMode);
      }
      if (isGroundingAccessable) {
        const clinic = getClinic(profile?.hospital_data);
        const userType = getHmTypeIndicator(investigationData);
        window.Moengage.track_event("TP_GD_Editted", {
          patient_id: patient_data?.patient_unique_id || "",
          patient_name: patient_data?.pm_fullname || "",
          doctor_id: profile?.doctor_unique_id,
          doctor_name: profile?.um_name,
          doctor_specialty: profile?.dp_name,
          hm_id: clinic?.hm_id,
          clinic_name: clinic?.hm_name,
          medicine_name: value,
          grounding_element: "Lab Investigations",
          // user: userType === "Z" ? "Zydus" : "Apollo",
        });
      }
    } catch (e) {
      // Fallback: just update the investigation
      handleNameSelect(itemId, value, option, isTabletMode);
    }
  }, [isGroundingAccessableForZydus, dontShowZydusWarning, handleNameSelect]);

  const handleRowEdit = (itemId) => {
    const item = labInvestigation.find(inv => inv.id === itemId);
    if (item) {
      setEditingRow(itemId);
      setRowEditValues({
        name: item.name || '',
        notes: item.notes || ''
      });
    }
  };

  const handleRowSave = (itemId) => {
    const updatedInvestigations = labInvestigation.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, ...rowEditValues };
        updated.lineItem = updated.name + (updated.notes ? ` (${updated.notes})` : '');
        return updated;
      }
      return item;
    });
    
    onUpdate(updatedInvestigations);
    setEditingRow(null);
    setRowEditValues({});
  };

  const handleRowCancel = () => {
    setEditingRow(null);
    setRowEditValues({});
  };

  const handleRowFieldChange = (field, value) => {
    setRowEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRowFieldKeyDown = (e, itemId) => {
    if (e.key === 'Enter' && isTablet && editingRow === itemId) {
      e.preventDefault();
      handleRowSave(itemId);
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
    setOriginalEditValue('');
    setFuzzySearchResults([]);
  };

  const handleCellKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCellCancel();
    }
  };

    const handleRowDelete = (e, itemId) => {
    e.stopPropagation();
    e.preventDefault();
    const updatedInvestigations = labInvestigation.filter(item => item.id !== itemId);
    onUpdate(updatedInvestigations);
  };

  // Drag and drop functionality
  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedInvestigations = reorder(
      labInvestigation,
      result.source.index,
      result.destination.index
    );
    onUpdate(reorderedInvestigations);
  };

  useEffect(() => {
    // Reset ref when patient context changes so isInitialEmpty is correct for the new patient
    hasHadInvestigationsRef.current = false;
  }, [patient_data?.patient_unique_id]);

  useEffect(() => {
    if (labInvestigation.length > 0) hasHadInvestigationsRef.current = true;
  }, [labInvestigation.length]);

  if (isProcessing) {
    return (
      <div className={styles['investigation-content-box']}>
        <div className={styles['investigation-header']}>
          <div className={styles['investigation-icon']}>
            <img src={investigationIcon} alt="Investigation" />
          </div>
          <span className={styles['investigation-title']}>{INVESTIGATION_TITLE}</span>
        </div>
        <div className={styles['investigation-editor-container']}>
          <div className={styles['investigation-shimmer-container']}>
            <div className={styles['investigation-shimmer']}></div>
          </div>
        </div>
      </div>
    );
  }

  const isInitialEmpty = isMedInvestigationFeatureOn && labInvestigation.length === 0 && !hasHadInvestigationsRef.current;
  const showEmptyMessage = labInvestigation.length === 0 && (isMedInvestigationFeatureOn ? hasHadInvestigationsRef.current : true);

  return (
    <div className={`${styles['investigation-content-box']} ${isInitialEmpty ? styles['compact-default'] : ''}`}>
      <div className={styles['investigation-header']}>
        <div className={styles['investigation-icon']}>
          <img src={investigationIcon} alt="Investigation" />
        </div>
        <span className={styles['investigation-title']}>{INVESTIGATION_TITLE}</span>
      </div>
      
            <DragDropContext onDragEnd={onDragEnd}>
      <div className={styles['investigation-table-container']}>
        <table className={styles['investigation-table']}>
          <thead>
            <tr>
              <th className={styles['drag-column']}></th>
                <th className={styles['medicine-column']}>INVESTIGATION NAME</th>
              <th className={styles['note-column']}>NOTE</th>
                <th className={styles['action-column']}></th>
            </tr>
          </thead>
            <Droppable droppableId="investigation-table" direction="vertical">
              {(provided) => (
                <tbody {...provided.droppableProps} ref={provided.innerRef}>
            {labInvestigation.map((item, index) => (
                    <Draggable key={item.id || `inv-${index}`} draggableId={`inv-${item.id || index}`} index={index}>
                      {(provided, snapshot) => (
                        <tr 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          key={item.id || index} 
                          className={styles['investigation-row']}
                          style={{
                            ...provided.draggableProps.style,
                            backgroundColor: snapshot.isDragging ? '#f0f0f0' : 'transparent'
                          }}
                        >
                          <td className={styles['drag-cell']} {...provided.dragHandleProps}>
                            <MenuOutlined 
                              className={styles['drag-icon']}
                              style={{ cursor: 'grab', fontSize: '16px', color: '#92929D' }}
                            />
                </td>
                <td 
                  className={styles['medicine-cell']}
                  onClick={!isTablet ? () => handleCellClick(item.id, 'name', item.name) : undefined}
                  style={{ cursor: !isTablet ? 'pointer' : 'default' }}
                >
                  {(!isTablet && editingCell?.itemId === item.id && editingCell?.field === 'name') || (isTablet && editingRow === item.id) ? (
                    <AutoComplete
                      value={isTablet && editingRow === item.id ? rowEditValues.name : editValue}
                      onSearch={onSearchParent}
                      options={parentSearchOptions}
                      onSelect={(val, option) => handleInvestigationSelection(item.id, val, option, isTablet && editingRow === item.id)}
                      defaultActiveFirstOption
                      popupMatchSelectWidth={false}
                      getPopupContainer={() => document.body}
                      dropdownStyle={{ width: 420 }}
                      style={{ width: '100%' }}
                      open={
                        !isTablet
                          ? editingCell?.itemId === item.id && editingCell?.field === 'name'
                          : undefined
                      }
                      autoFocus={true}
                    >
                      <Input
                        value={isTablet && editingRow === item.id ? rowEditValues.name : editValue}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          if (isTablet && editingRow === item.id) {
                            handleRowFieldChange('name', newValue);
                          } else {
                            setEditValue(newValue);
                            // Sync searchQuery when user types (for name field)
                            if (editingCell?.itemId === item.id && editingCell?.field === 'name') {
                              setSearchQuery(newValue);
                            }
                          }
                        }}
                        onBlur={isTablet && editingRow === item.id ? undefined : handleCellSave}
                        onKeyDown={isTablet && editingRow === item.id ? (e) => handleRowFieldKeyDown(e, item.id) : handleCellKeyDown}
                        onFocus={() => {
                          // Sync searchQuery with editValue if needed (useEffect will handle the search)
                          if (!isTablet && editingCell?.itemId === item.id && editingCell?.field === 'name') {
                            const currentValue = editValue || '';
                            // Only sync if there's a value and it's different from searchQuery
                            // Don't trigger API calls on focus - let useEffect handle it
                            if (currentValue.trim().length > 0 && currentValue !== searchQuery) {
                              setSearchQuery(currentValue);
                            } else if (!currentValue || currentValue.trim().length === 0) {
                              // Only set empty searchQuery, don't call API here
                              setSearchQuery('');
                            }
                          }
                        }}
                        className={styles['edit-input']}
                        placeholder="Enter investigation name"
                        autoFocus
                      />
                    </AutoComplete>
                  ) : (
                    <span className={styles['medicine-text']}>
                      {item.name || '-'}
                      {(((item?.metadata?.hm_type === 1 || item?.metadata?.hm_type === 2) && item?.metadata?.um_id === 0) ||
                        ((item?.hm_type === 1 || item?.hm_type === 2) && item?.um_id === 0)) && (
                        <span
                          className="align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-circle text-white ms-2"
                          style={{ 
                            width: 18, 
                            height: 18, 
                            backgroundImage: `url(${groundingIndicatorBg})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                          }}
                        >
                          <div className="sc-tour-button">
                              {getHmTypeIndicator(item?.metadata || item)}
                            </div>
                        </span>
                      )}
                    </span>
                  )}
                </td>
                                                <td 
                  className={styles['note-cell']}
                  onClick={!isTablet ? () => handleCellClick(item.id, 'notes', item.notes) : undefined}
                  style={{ cursor: !isTablet ? 'pointer' : 'default' }}
                >
                  {(!isTablet && editingCell?.itemId === item.id && editingCell?.field === 'notes') || (isTablet && editingRow === item.id) ? (                                                                        
                    <input
                      type="text"
                      value={isTablet && editingRow === item.id ? rowEditValues.notes : editValue}
                      onChange={(e) => isTablet && editingRow === item.id ? handleRowFieldChange('notes', e.target.value) : setEditValue(e.target.value)}
                      onBlur={isTablet && editingRow === item.id ? undefined : handleCellSave}
                      onKeyDown={isTablet && editingRow === item.id ? (e) => handleRowFieldKeyDown(e, item.id) : handleCellKeyDown}
                      className={styles['edit-input']}
                      placeholder="Enter notes"
                      autoFocus={!isTablet}
                    />
                  ) : (
                    <span className={styles['note-text']}>
                      {item.notes || item.lineItem || item.instruction|| '-'}
                    </span>
                  )}
                </td>
                <td className={`${styles['action-cell']} ${isTablet ? styles['action-cell-sticky'] : ''}`}>
                  {isTablet ? (
                    <div className={styles['action-buttons']}>
                      <i 
                        className={editingRow === item.id ? "icon-check text-main" : "icon-Edit text-main"}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editingRow === item.id) {
                            handleRowSave(item.id);
                          } else {
                            handleRowEdit(item.id);
                          }
                        }}
                        style={{ cursor: 'pointer', fontSize: '16px', marginRight: '8px', color: editingRow === item.id ? '#52c41a' : undefined }}
                        title={editingRow === item.id ? 'Save changes' : 'Edit row'}
                      />
                      <i 
                        className="icon-delete" 
                        onClick={(e) => handleRowDelete(e, item.id)}
                        style={{ cursor: 'pointer', fontSize: '16px', color: '#92929D' }}
                      />
                    </div>
                  ) : (
                    <i 
                      className="icon-delete" 
                      onClick={(e) => handleRowDelete(e, item.id)}
                      style={{ cursor: 'pointer', fontSize: '16px', color: '#92929D' }}
                    />
                  )}
                </td>
              </tr>
                      )}
                    </Draggable>
            ))}
                  {provided.placeholder}
          </tbody>
              )}
            </Droppable>
        </table>
        
        {showEmptyMessage && (
          <div className={styles['empty-state']}>
            <p>No investigations found</p>
          </div>
        )}
      </div>
      </DragDropContext>
      
      <div className={styles['search-container']}>
        <div className={styles['search-input-wrapper']}>
          <AutoComplete
            value={searchQuery}
            onSearch={onSearchParent}
            options={parentSearchOptions}
            className={styles['search-autocomplete']}
            onSelect={onSelectParent}
            defaultActiveFirstOption={true}
            popupClassName={!searchQuery && "boxpopup"}
            dropdownStyle={{ width: 420 }}
          >
            <Input
              placeholder="Search by Investigation Name"
              prefix={<img src={investigationIcon} alt="Search" className={styles['search-icon']} />}
              className={styles['search-input']}
            />
          </AutoComplete>
        </div>
      </div>
      
      <CommonModal
        isModalOpen={showNonZydusWarning}
        onCancel={() => {
          setShowNonZydusWarning(false);
          setPendingSelection(null);
        }}
        modalWidth={550}
        title={'Not in Zydus Data Engine'}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-3">
              <div className="d-flex align-items-start">
                <i
                  className="icon-Warning fs-24 me-3"
                  style={{ color: '#F59E0B' }}
                ></i>
                <div>
                  <span className="semi-bold-text">
                    "{pendingSelection?.value}"
                  </span>{' '}
                  is <span className="semi-bold-text">not </span>in
                  <span className="semi-bold-text"> Zydus Data Engine</span>.
                  Prescribing it may impact{' '}
                  <span className="semi-bold-text">patient fulfilment</span>.
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="d-flex align-items-center">
                <input
                  type="checkbox"
                  id="dontShowAgain"
                  checked={dontShowZydusWarning}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDontShowZydusWarning(checked);
                    localStorage.setItem(
                      'dontShowZydusWarning',
                      checked.toString()
                    );
                  }}
                  style={{ marginRight: 8, width: 16, height: 16 }}
                />
                <label
                  htmlFor="dontShowAgain"
                  style={{ cursor: 'pointer', marginBottom: 0 }}
                >
                  Don't show this again
                </label>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={() => {
                    setShowNonZydusWarning(false);
                    setPendingSelection(null);
                  }}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  <span>Go Back</span>
                </div>
                <Button
                  onClick={() => {
                    if (pendingSelection) {
                      if (pendingSelection.isNewInvestigation) {
                        // Adding new investigation from search input
                        addNewInvestigation(pendingSelection.value, pendingSelection.option);
                      } else {
                        // Editing existing investigation
                        handleNameSelect(
                          pendingSelection.itemId,
                          pendingSelection.value,
                          pendingSelection.option,
                          pendingSelection.isTabletMode
                        );
                      }
                    }
                    setShowNonZydusWarning(false);
                    setPendingSelection(null);
                  }}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
                  <span>Yes, Proceed</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    </div>
  );
};

export default LabInvestigationTable;
