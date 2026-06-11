import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Drawer, Input, Button, Spin } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { searchTag, addTag } from '../../redux/medicalhistorySlice';
import { errorMessage, removeBeforeWhiteSpace } from '../../utils/utils';

import './MobileEditQuickList.scss';
import { ASSETS } from "../../assets";
const {
  close2: closeIcon,
  close: chipCloseIcon,
} = ASSETS.mobile;

function MobileEditQuickList({ 
  visible, 
  onClose, 
  section,
  onSave
}) {
  const dispatch = useDispatch();
  const { searchList, loading } = useSelector((state) => state.medicalhistory);
  const prevVisibleRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editedSection, setEditedSection] = useState(null);

  // Init only when drawer opens (visible false -> true) so parent re-renders don't overwrite local state (avoids tag count flip).
  useEffect(() => {
    const justOpened = visible && !prevVisibleRef.current;
    if (justOpened && section) {
      const clonedSection = JSON.parse(JSON.stringify(section));
      const tags = Array.isArray(clonedSection.tags) ? clonedSection.tags : [];
      clonedSection.tags = tags.map((tag) => ({
        ...tag,
        unique_id: tag.unique_id || uuidv4()
      }));
      setEditedSection(clonedSection);
      setSearchQuery('');
      setSearchOptions([]);
    }
    prevVisibleRef.current = visible;
  }, [visible, section]);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      setSearchOptions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      if (editedSection?.tmmhs_id) {
        dispatch(searchTag({ 
          section_id: editedSection.tmmhs_id, 
          keyword: searchQuery.trim() // Use 'keyword' (same as web)
        }));
      }
    }, 500); // Debounce 500ms (same as web)

    return () => clearTimeout(timeoutId);
  }, [searchQuery, editedSection?.tmmhs_id, dispatch]);

  useEffect(() => {
    const data = [];
    if (searchList && Array.isArray(searchList)) {
      searchList.forEach((e) => {
        data.push({
          key: JSON.stringify({ ...e, unique_id: uuidv4() }),
          value: e.title || e.tmmhst_name
        });
      });
    }
    
    if (searchQuery.length > 0) {
      data.push({
        key: JSON.stringify({
          unique_id: uuidv4(),
          tmmhst_id: 0,
          pms_default: 1,
          title: searchQuery
        }),
        value: searchQuery,
        isCustom: true
      });
    }
    
    setSearchOptions(data);
    setIsSearching(false);
  }, [searchList, searchQuery]);

  const handleSearchChange = (e) => {
    setSearchQuery(removeBeforeWhiteSpace(e.target.value));
  };

  const handleSelectTag = useCallback((tagData) => {
    if (!editedSection) return;

    const tag = typeof tagData === 'string' ? JSON.parse(tagData) : tagData;
    const normalizedTitle = tag?.title?.trim().toLowerCase();
    const existingTag = editedSection.tags.find(
      t => t.title?.trim().toLowerCase() === normalizedTitle
    );

    if (!existingTag) {
      setEditedSection(prev => ({
        ...prev,
        tags: [...prev.tags, { ...tag }]
      }));
    }

    setSearchQuery('');
  }, [editedSection]);

  const handleRemoveTag = useCallback((tag) => {
    if (!editedSection) return;

    const actualIndex = editedSection.tags.findIndex(
      (t) => t.unique_id === tag.unique_id
    );
    if (actualIndex === -1) return;

    const target = editedSection.tags[actualIndex];
    setEditedSection((prev) => {
      if (target.tmmhst_id === 0) {
        return {
          ...prev,
          tags: prev.tags.filter((_, i) => i !== actualIndex)
        };
      }
      return {
        ...prev,
        tags: prev.tags.map((t, i) =>
          i === actualIndex ? { ...t, delete: true } : t
        )
      };
    });
  }, [editedSection]);

  const handleSave = async () => {
    if (!editedSection) return;

    const sendData = JSON.parse(JSON.stringify(editedSection));
    
    const action = await dispatch(addTag(sendData));
    
    if (action.meta.requestStatus === "fulfilled") {
      if (action.payload.tags && action.payload.tags.length > 0) {
        const updatedTags = action.payload.tags.map((responseTag) => {
          const localTag = sendData.tags.find(t => t.unique_id === responseTag.unique_id);
          return { ...localTag, ...responseTag };
        });
        
        const finalTags = updatedTags.map(({ unique_id, ...rest }) => rest);
        
        const updatedSection = {
          ...editedSection,
          tags: finalTags
        };
        
        if (onSave) {
          onSave(updatedSection);
        }
      } else {
        const updatedSection = {
          ...editedSection,
          tags: []
        };
        
        if (onSave) {
          onSave(updatedSection);
        }
      }
    } else {
      errorMessage(action.error);
    }
  };

  const handleCancel = () => {
    setSearchQuery('');
    setSearchOptions([]);
    onClose();
  };

  if (!visible || !editedSection) return null;

  const visibleTags = editedSection.tags.filter(t => !t.delete);

  return (
    <Drawer
      placement="bottom"
      onClose={handleCancel}
      open={visible}
      height="70vh"
      className="mobile-edit-quick-list"
      closable={false}
      maskClosable={false}
    >
      <div className="mobile-edit-quick-list-content">
        {/* Header */}
        <div className="mobile-edit-quick-list-header">
          <h3 className="mobile-edit-quick-list-title">
            {editedSection.title || 'Edit & Add'}
          </h3>
          <button
            className="mobile-edit-quick-list-close"
            onClick={handleCancel}
            type="button"
            aria-label="Close"
          >
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        {/* Search Input */}
        <div className="mobile-edit-quick-list-search">
          <Input
            className="search-input"
            placeholder={`Search ${editedSection.title || 'items'}`}
            value={searchQuery}
            onChange={handleSearchChange}
            prefix={<i className="icon-search" />}
            allowClear
          />
        </div>

        {/* Body */}
        <div className="mobile-edit-quick-list-body">
          {isSearching || loading ? (
            <div className="loading-container">
              <Spin />
            </div>
          ) : searchQuery.trim().length > 0 ? (
            <div className="search-results">
              {searchOptions.map((item, i) => {
                const isCustom = item.isCustom || i === searchOptions.length - 1;
                return isCustom ? (
                  <Button
                    key={i}
                    type="text"
                    className="tag-chip tag-chip-custom"
                    onClick={() => handleSelectTag(item.key)}
                  >
                    "{item.value}" <i className="icon-Add mx-2" /> 
                    <span className="add-custom-text">Add Custom</span>
                  </Button>
                ) : (
                  <Button
                    key={i}
                    type="text"
                    className="tag-chip"
                    onClick={() => handleSelectTag(item.key)}
                  >
                    {item.value}
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="tags-list">
              {visibleTags.length > 0 ? (
                <div className="tags-grid">
                  {visibleTags.map((tag, index) => (
                    <div key={tag.unique_id || index} className="tag-item">
                      {tag.title}
                      <button
                        type="button"
                        className="tag-remove-icon"
                        aria-label={`Remove ${tag.title || 'tag'}`}
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <img src={chipCloseIcon} alt="" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-message">
                  No items in this section. Search to add items.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mobile-edit-quick-list-footer">
          <Button
            type="text"
            className="cancel-btn"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            className="save-btn"
            onClick={handleSave}
            loading={loading}
          >
            Save
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export default MobileEditQuickList;
