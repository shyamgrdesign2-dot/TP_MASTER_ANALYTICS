import React, { useState, useEffect, useCallback } from 'react';
import { Drawer, Input, Button, Spin } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { searchTag, addTag } from '../../redux/medicalhistorySlice';

import './MobileTagSelector.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

/**
 * Mobile bottom sheet for searching and selecting medical history tags
 * Matches web functionality: search tags, select existing, or add custom
 * This is the entry point before editing a tag
 */
function MobileTagSelector({ 
  visible, 
  onClose, 
  section, // The section being edited (has tmmhs_id, title, tags)
  onTagSelect, // Callback when tag is selected (opens edit sheet)
  onBack // Go back to sections list
}) {
  const dispatch = useDispatch();
  const { searchList, loading } = useSelector((state) => state.medicalhistory);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get all tags in this section (Y and N)
  const allTags = section?.tags || [];
  const existingTagsMap = new Map();
  allTags.forEach(tag => {
    if (tag.title) {
      existingTagsMap.set(tag.title.toLowerCase(), tag);
    }
  });

  // Search for tags when query changes
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      if (section?.tmmhs_id) {
        dispatch(searchTag({ 
          section_id: section.tmmhs_id, 
          query: searchQuery.trim() 
        }));
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, section?.tmmhs_id, dispatch]);

  // Update search results from redux
  useEffect(() => {
    if (searchList && Array.isArray(searchList)) {
      setSearchResults(searchList);
      setIsSearching(false);
    }
  }, [searchList]);

  // Handle tag selection
  const handleTagSelect = useCallback((tag, forceEnable = null) => {
    const tagTitle = (tag.title || tag.tmmhst_name || '').toLowerCase();
    const existingTag = existingTagsMap.get(tagTitle);
    
    if (existingTag) {
      // Tag already exists, edit it
      onTagSelect?.(existingTag, false); // false = editing existing
    } else {
      // New tag, create with specified enable state
      const newTag = {
        tmmhst_id: tag.tmmhst_id || Date.now() + Math.random(),
        title: tag.title || tag.tmmhst_name || '',
        pms_default: tag.pms_default || 0,
        enable: forceEnable || 'Y',
        note: '',
        since: '',
        status: 'Active',
        relationship: '',
        medication: ''
      };
      onTagSelect?.(newTag, true); // true = new tag
    }
  }, [existingTagsMap, onTagSelect]);

  // Handle custom tag creation
  const handleAddCustom = useCallback(() => {
    if (!searchQuery || searchQuery.trim().length === 0) return;

    const customTagName = searchQuery.trim();
    const existingTag = existingTagsMap.get(customTagName.toLowerCase());
    
    // Check if already exists
    if (existingTag) {
      onTagSelect?.(existingTag, false);
      return;
    }

    // Create new custom tag
    const newTag = {
      tmmhst_id: Date.now() + Math.random(),
      title: customTagName,
      pms_default: 0,
      enable: 'Y',
      note: '',
      since: '',
      status: 'Active',
      relationship: '',
      medication: ''
    };

    // Add to backend if needed
    if (section?.tmmhs_id) {
      dispatch(addTag({
        section_id: section.tmmhs_id,
        tag_name: customTagName
      }));
    }

    onTagSelect?.(newTag, true);
  }, [searchQuery, section?.tmmhs_id, existingTagsMap, onTagSelect, dispatch]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!visible) return null;

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="70vh"
      className="mobile-tag-selector"
      closable={false}
      maskClosable={true}
    >
      <div className="mobile-tag-selector-content">
        {/* Header */}
        <div className="mobile-tag-selector-header">
          <button
            className="mobile-tag-selector-back"
            onClick={onBack}
            type="button"
          >
            <i className="icon-left" />
          </button>
          <h3 className="mobile-tag-selector-title">
            {section?.title || 'Select Item'}
          </h3>
          <button
            className="mobile-tag-selector-close"
            onClick={onClose}
            type="button"
          >
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        {/* Search Input */}
        <div className="mobile-tag-selector-search">
          <Input
            className="search-input"
            placeholder={`Search ${section?.title || 'items'}`}
            value={searchQuery}
            onChange={handleSearchChange}
            prefix={<i className="icon-search" />}
            allowClear
            onClear={handleClearSearch}
          />
        </div>

        {/* Results */}
        <div className="mobile-tag-selector-body">
          {isSearching || loading ? (
            <div className="loading-container">
              <Spin />
            </div>
          ) : searchQuery.trim().length > 0 ? (
            // Search results
            <div className="search-results">
              {searchResults.length > 0 ? (
                <>
                  {searchResults.map((tag, index) => {
                    const tagTitle = (tag.title || tag.tmmhst_name)?.toLowerCase();
                    const existingTag = existingTagsMap.get(tagTitle);
                    const enable = existingTag?.enable;
                    
                    return (
                      <Button
                        key={index}
                        type="text"
                        className={`tag-chip ${existingTag ? 'tag-chip-existing' : ''}`}
                        onClick={() => handleTagSelect(tag)}
                      >
                        {tag.title || tag.tmmhst_name}
                        {enable === 'Y' && <span className="status-badge status-y">Y</span>}
                        {enable === 'N' && <span className="status-badge status-n">N</span>}
                        {!enable && existingTag && <span className="status-badge status-dash">-</span>}
                      </Button>
                    );
                  })}
                  
                  {/* Add Custom option */}
                  <Button
                    type="text"
                    className="tag-chip tag-chip-custom"
                    onClick={handleAddCustom}
                  >
                    "{searchQuery}" <i className="icon-Add mx-2" /> 
                    <span className="add-custom-text">Add Custom</span>
                  </Button>
                </>
              ) : (
                // No results, show add custom
                <div className="no-results">
                  <p className="no-results-text">No results found</p>
                  <Button
                    type="primary"
                    className="add-custom-btn"
                    onClick={handleAddCustom}
                  >
                    <i className="icon-Add me-2" />
                    Add "{searchQuery}" as custom
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // Show existing tags in section
            <div className="existing-tags">
              <h4 className="section-subtitle">Items in this section</h4>
              {allTags.length > 0 ? (
                <div className="tags-grid">
                  {allTags.map((tag, index) => (
                    <Button
                      key={index}
                      type="text"
                      className="tag-chip tag-chip-existing"
                      onClick={() => handleTagSelect(tag)}
                    >
                      {tag.title}
                      {tag.enable === 'Y' && <span className="status-badge status-y">Y</span>}
                      {tag.enable === 'N' && <span className="status-badge status-n">N</span>}
                      {!tag.enable && <span className="status-badge status-dash">-</span>}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="empty-message">
                  No items added yet. Search to add items.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default MobileTagSelector;
