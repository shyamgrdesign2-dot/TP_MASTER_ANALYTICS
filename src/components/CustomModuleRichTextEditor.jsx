import React, { useCallback, useMemo } from 'react';
import RichTextEditor from './richTextEditor/RichTextEditor';
import { arrayToSlateBulletList, slateBulletListToArray } from '../utils/slateHelpers';
import styles from './ConsultationDrawer.module.css';
import { Dropdown, Menu } from 'antd';
import { ASSETS } from "../assets";
const {
  deleteIconBlue: deleteModuleIcon,
  customModule: customModuleIcon,
} = ASSETS.images;

/**
 * CustomModuleRichTextEditor - Rich text editor for custom modules
 * Converts between array format [{lineItem: "text"}] and Slate.js format
 */
const CustomModuleRichTextEditor = ({
  moduleName,
  moduleData = [],
  onUpdate,
  onDelete,
  onEdit,
  isProcessing = false,
  className = '',
  isLocalModule = false,
  editingModule = null,
  updatedModuleName = '',
  onEditNameChange = null,
  onEditSave = null,
  onEditCancel = null,
}) => {
  const initialSlateValue = useMemo(() => {
    if (!moduleData || moduleData.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    // Convert array of strings or objects to formatted text
    const formattedItems = moduleData.map(item => {
      if (typeof item === 'string') {
        return item;
      }
      return item?.lineItem || item?.name || '';
    }).filter(text => text.trim() !== '');
    
    if (formattedItems.length === 0) {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    return arrayToSlateBulletList(formattedItems);
  }, [moduleData]);

  const handleChange = useCallback((value) => {
    const items = slateBulletListToArray(value);
    const moduleArray = items.map(text => ({ lineItem: text }));
    
    if (onUpdate) {
      onUpdate(moduleArray);
    }
  }, [onUpdate]);

  const displayName = useMemo(() => {
    if (isLocalModule) {
      return moduleName;
    }
    return moduleName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  }, [moduleName, isLocalModule]);

  if (isProcessing) {
    return (
      <div className={`${styles['symptoms-rich-text-editor']} ${className}`}>
        <div className={styles['symptoms-content-box']}>
          <div className={styles['symptoms-header']}>
            <div className={styles['symptoms-icon']}>
              <img src={customModuleIcon} alt={displayName} />
            </div>
            <span className={styles['symptoms-title']}>{displayName}</span>
          </div>
          <div className={styles['symptoms-editor-container']}>
            <div className={styles['symptoms-shimmer-container']}>
              <div className={styles['symptoms-shimmer']}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles['symptoms-rich-text-editor']} ${className}`}>
      <div className={styles['symptoms-content-box']}>
        <div className={styles['symptoms-header']} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={styles['symptoms-icon']}>
              <img src={customModuleIcon} alt={displayName} />
            </div>
            {editingModule === moduleName ? (
              <input
                type="text"
                value={updatedModuleName}
                onChange={(e) => onEditNameChange && onEditNameChange(e.target.value)}
                onBlur={() => onEditSave && onEditSave()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onEditSave && onEditSave();
                  } else if (e.key === 'Escape') {
                    onEditCancel && onEditCancel();
                  }
                }}
                style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '16px',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                }}
                autoFocus
              />
            ) : (
              <>
                <span className={styles['symptoms-title']}>{displayName}</span>
                {isLocalModule && (
                  <i
                    className="icon-Edit fs-21 cursor-pointer"
                    onClick={() => onEdit && onEdit(moduleName)}
                    style={{ marginLeft: '8px', cursor: 'pointer' }}
                  ></i>
                )}
              </>
            )}
          </div>
          {!editingModule && (
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item
                    key="delete"
                    onClick={() => onDelete && onDelete(moduleName)}
                    style={{
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#ff4d4f',
                      padding: '8px 12px',
                    }}
                  >
                    <img
                      src={deleteModuleIcon}
                      width={16}
                      height={16}
                      alt="delete"
                      style={{ margin: '0 8px 3px 0' }}
                    />
                    Delete {displayName} Module
                  </Menu.Item>
                </Menu>
              }
              trigger={['click']}
              placement="bottomRight"
            >
              <i className="icon-More fs-21 cursor-pointer" style={{ cursor: 'pointer' }}></i>
            </Dropdown>
          )}
        </div>
        <div className={styles['symptoms-editor-container']}>
          <RichTextEditor
            initialValue={initialSlateValue}
            onChange={handleChange}
            placeholder={`Add ${displayName.toLowerCase()}...`}
            spellCheck={true}
            autoFocus={false}
            showToolbar={false}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomModuleRichTextEditor;

