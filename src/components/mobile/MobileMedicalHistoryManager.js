import React, { useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { listSectionwithTag } from '../../redux/medicalhistorySlice';
import CashManagerContext from '../../context/CashManagerContext';
import { getClinicName } from '../../utils/utils';
import MobileMedicalHistorySectionsList from './MobileMedicalHistorySectionsList';
import MobileMedicalHistoryItemEdit from './MobileMedicalHistoryItemEdit';
import MobileFamilyHistoryItemEdit from './MobileFamilyHistoryItemEdit';
import MobileRelationshipSelect from './MobileRelationshipSelect';
import MobileSurgicalHistoryItemEdit from './MobileSurgicalHistoryItemEdit';
import MobileAdditionalHistoryEdit from './MobileAdditionalHistoryEdit';
import MobileNoConditionScreen from './MobileNoConditionScreen';
import MobileEditQuickList from './MobileEditQuickList';

const normalizeTitle = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

function MobileMedicalHistoryManager({ 
  visible, 
  onClose, 
  onSave,
  patient_data
}) {
  const dispatch = useDispatch();
  const { defaultList } = useSelector((state) => state.medicalhistory);
  const { profile } = useSelector((state) => state.doctors);
  const { medicalHistoryData, setMedicalHistoryData } = useContext(CashManagerContext) || {};
  
  const [currentSheet, setCurrentSheet] = useState('list');
  const [editingSection, setEditingSection] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingSectionType, setEditingSectionType] = useState(null);
  const [selectedRelationship, setSelectedRelationship] = useState('');

  useEffect(() => {
    dispatch(listSectionwithTag());
  }, [dispatch]);

  const mergedMedicalHistoryData = useMemo(() => {
    if (!defaultList || defaultList.length === 0) {
      return medicalHistoryData || [];
    }

    try {
      const data1 = defaultList ? JSON.parse(JSON.stringify(defaultList)) : [];
      const data2 = medicalHistoryData ? JSON.parse(JSON.stringify(medicalHistoryData)) : [];
      
      if (data2.length === 0) {
        return data1;
      }

      const mergedArray = data1.map(e => {
        const matchingSection = data2.find(x => x?.tmmhs_id === e?.tmmhs_id);
        if (!matchingSection) {
          return e;
        }
        
        const existingTagsById = new Map();
        const existingTagsByTitle = new Map();
        (e?.tags || []).forEach(tag => {
          if (tag?.tmmhst_id) {
            existingTagsById.set(tag.tmmhst_id, tag);
          }
          const normalizedTitle = normalizeTitle(tag?.title);
          if (normalizedTitle) {
            existingTagsByTitle.set(normalizedTitle, tag);
          }
        });
        
        const mergedTags = [...(e?.tags || [])];
        (matchingSection?.tags || []).forEach(newTag => {
          const existingById = newTag?.tmmhst_id && existingTagsById.get(newTag.tmmhst_id);
          if (existingById) {
            const index = mergedTags.findIndex(t => t?.tmmhst_id === newTag.tmmhst_id);
            if (index !== -1) {
              mergedTags[index] = { ...mergedTags[index], ...newTag };
            }
          } else {
            const normalizedTitle = normalizeTitle(newTag?.title);
            const existingByTitle = normalizedTitle && existingTagsByTitle.get(normalizedTitle);
            if (!existingByTitle) {
              mergedTags.push(newTag);
            } else {
              const index = mergedTags.findIndex(
                t => normalizeTitle(t?.title) === normalizedTitle
              );
              if (index !== -1) {
                mergedTags[index] = { ...mergedTags[index], ...newTag };
              }
            }
          }
        });
        
        const userTagList = matchingSection?.tags || [];
        const filteredTags = mergedTags.filter(tag => {
          if (tag.delete === true) {
            return false;
          }
          const userTag = userTagList.find(ut =>
            (ut?.tmmhst_id && tag?.tmmhst_id && ut.tmmhst_id === tag.tmmhst_id) ||
            (normalizeTitle(ut?.title) === normalizeTitle(tag?.title))
          );
          if (userTag && userTag.delete === true) {
            return false;
          }
          // When user has saved this section, only show tags in their list (stops removed tags reappearing from defaultList).
          if (userTagList.length > 0 && !userTag) {
            return false;
          }
          return true;
        });
        
        return {
          ...e,
          ...matchingSection,
          tags: filteredTags
        };
      });

      return mergedArray;
    } catch (error) {
      return medicalHistoryData || [];
    }
  }, [defaultList, medicalHistoryData]);

  const handleSave = useCallback(() => {
    if (!setMedicalHistoryData) return;
    const sourceData = mergedMedicalHistoryData?.length ? mergedMedicalHistoryData : medicalHistoryData;
    if (!sourceData) return;

    const clinic_name = getClinicName(profile?.hospital_data);
    if (window.Moengage) {
      window.Moengage.track_event("TP_Medical_history_updated", {
        clinic_name,
        patient_number: patient_data?.pm_contact_no,
        patient_id: patient_data?.patient_unique_id
      });
    }

    const remarks = sourceData?.[0]?.medical_history_remarks;
    const medicalHistory = sourceData.map((e, i) => {
      return {
        title: e?.title,
        tmmhs_id: e?.tmmhs_id,
        no_know_history: e?.no_know_history !== undefined ? e?.no_know_history : false,
        tags: !e?.no_know_history
          ? (e?.tags || []).filter((x) => x.delete !== true)
          : [],
        ...(remarks && i === 0 && { medical_history_remarks: remarks?.trim() }),
      };
    });

    if (!remarks && medicalHistory.filter(e => !e?.no_know_history && e?.tags?.length === 0).length === medicalHistory.length) {
      setMedicalHistoryData([]);
      if (onSave) {
        onSave([]);
      }
      onClose?.();
    } else {
      setMedicalHistoryData(JSON.parse(JSON.stringify(medicalHistory)));
      if (onSave) {
        const rxPadFormat = convertContextToRxPadFormatForSave(medicalHistory);
        onSave(rxPadFormat);
      }
      onClose?.();
    }
  }, [mergedMedicalHistoryData, medicalHistoryData, setMedicalHistoryData, onSave, onClose, profile, patient_data]);

  const handleClose = useCallback(() => {
    if (!medicalHistoryData || !setMedicalHistoryData) {
      setCurrentSheet('list');
      setEditingSection(null);
      setEditingItem(null);
      setEditingSectionType(null);
      setSelectedRelationship('');
      onClose?.();
      return;
    }

    const remarks = medicalHistoryData?.[0]?.medical_history_remarks;
    const medicalHistory = medicalHistoryData?.map((e, i) => {
      return {
        title: e?.title,
        tmmhs_id: e?.tmmhs_id,
        no_know_history: e?.no_know_history !== undefined ? e?.no_know_history : false,
        tags: !e?.no_know_history
          ? (e?.tags || []).filter((x) => x.delete !== true)
          : [],
        ...(remarks && i === 0 && { medical_history_remarks: remarks?.trim() }),
      };
    });

    if (!remarks && medicalHistory.filter(e => !e?.no_know_history && e?.tags?.length === 0).length === medicalHistory.length) {
      setMedicalHistoryData([]);
      if (onSave) {
        onSave([]);
      }
    } else {
      setMedicalHistoryData(JSON.parse(JSON.stringify(medicalHistory)));
      if (onSave) {
        const rxPadFormat = convertContextToRxPadFormatForSave(medicalHistory);
        setTimeout(() => onSave(rxPadFormat), 0);
      }
    }
    setCurrentSheet('list');
    setEditingSection(null);
    setEditingItem(null);
    setEditingSectionType(null);
    setSelectedRelationship('');
    onClose?.();
  }, [onClose, medicalHistoryData, setMedicalHistoryData, onSave]);

  const handleNoKnownHistoryChange = useCallback((tmmhs_id, checked) => {
    if (!setMedicalHistoryData) return;
    const sourceData = mergedMedicalHistoryData?.length ? mergedMedicalHistoryData : medicalHistoryData;
    if (!sourceData) return;

    const updated = sourceData.map(section => {
      if (section.tmmhs_id === tmmhs_id) {
        return {
          ...section,
          no_know_history: checked,
          tags: checked ? [] : (section.tags || []) // Clear tags if no known history
        };
      }
      return section;
    });

    setMedicalHistoryData(updated);
  }, [mergedMedicalHistoryData, medicalHistoryData, setMedicalHistoryData]);

  const handleChipClick = useCallback((section, tag) => {
    setEditingSection(section);
    setEditingSectionType(section.tmmhs_id);
    setEditingItem(tag);
    setSelectedRelationship(section.tmmhs_id === 3 ? (tag?.relationship || '') : '');
    if (tag.enable === 'N') {
      setCurrentSheet('noCondition');
    } else {
      setCurrentSheet('editItem');
    }
  }, []);

  const handleSetActive = useCallback((tag) => {
    const updatedTag = {
      ...tag,
      enable: 'Y'
    };
    setEditingItem(updatedTag);
    setSelectedRelationship(editingSectionType === 3 ? (tag?.relationship || '') : '');
    setCurrentSheet('editItem');
  }, [editingSectionType]);
  const handleEditQuickList = useCallback((section) => {
    setEditingSection(section);
    setEditingSectionType(section.tmmhs_id);
    setCurrentSheet('editQuickList');
  }, []);

  const handleQuickListSave = useCallback((updatedSection) => {
    if (!setMedicalHistoryData) return;
    const sourceData = mergedMedicalHistoryData?.length ? mergedMedicalHistoryData : medicalHistoryData;
    if (!sourceData) return;

    const updatedData = sourceData.map(section => {
      if (section.tmmhs_id === updatedSection.tmmhs_id) {
        return updatedSection;
      }
      return section;
    });

    setMedicalHistoryData(updatedData);
    
    setCurrentSheet('list');
  }, [mergedMedicalHistoryData, medicalHistoryData, setMedicalHistoryData]);
  const handleChipEnableClick = useCallback((section, tag) => {
    if (!setMedicalHistoryData) return;
    const sourceData = mergedMedicalHistoryData?.length ? mergedMedicalHistoryData : medicalHistoryData;
    if (!sourceData) return;
    const nextEnable =
      tag.enable === 'Y' ? 'N' : tag.enable === 'N' ? undefined : 'Y';
    const updated = sourceData.map((sec) => {
      if (sec.tmmhs_id !== section.tmmhs_id) return sec;
      const tagIndex = (sec.tags || []).findIndex(
        (t) => t.tmmhst_id === tag.tmmhst_id
      );
      if (tagIndex === -1) return sec;
      const newTags = [...(sec.tags || [])];
      newTags[tagIndex] = { ...newTags[tagIndex], enable: nextEnable };
      return { ...sec, tags: newTags };
    });
    setMedicalHistoryData(updated);
  }, [mergedMedicalHistoryData, medicalHistoryData, setMedicalHistoryData]);

  const handleItemSave = useCallback((updatedItem) => {
    if (!setMedicalHistoryData || !editingSection) return;
    const sourceData = mergedMedicalHistoryData?.length ? mergedMedicalHistoryData : medicalHistoryData;
    if (!sourceData) return;

    const updated = sourceData.map(section => {
      if (section.tmmhs_id === editingSection.tmmhs_id) {
        const existingTagIndex = (section.tags || []).findIndex(
          t => t.tmmhst_id === updatedItem.tmmhst_id
        );

        let newTags;
        if (existingTagIndex !== -1) {
          newTags = [...(section.tags || [])];
          newTags[existingTagIndex] = updatedItem;
        } else {
          newTags = [...(section.tags || []), updatedItem];
        }

        return {
          ...section,
          tags: newTags,
          no_know_history: false // Uncheck no known history when adding items
        };
      }
      return section;
    });

    setMedicalHistoryData(updated);
    
    if (onSave) {
      const rxPadFormat = convertContextToRxPadFormatForSave(updated);
      onSave(rxPadFormat);
    }

    setCurrentSheet('list');
    setEditingItem(null);
  }, [mergedMedicalHistoryData, medicalHistoryData, setMedicalHistoryData, editingSection, onSave]);

  const handleOpenRelationshipPicker = useCallback((currentRelationship) => {
    setSelectedRelationship(currentRelationship || '');
    setCurrentSheet('relationship');
  }, []);

  const handleRelationshipSelect = useCallback((relationship) => {
    setSelectedRelationship(relationship);
    
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        relationship: relationship
      });
    }
    
    setCurrentSheet('editItem');
  }, [editingItem]);

  const convertContextToRxPadFormatForSave = (contextData) => {
    const idToTypeMap = {
      1: 'Lifestyle',
      2: 'Medical Condition',
      3: 'Family History',
      4: 'Allergies',
      5: 'Surgical History'
    };

    const rxPadArray = [];
    let medicalHistoryRemarks = (contextData && contextData[0]) ? contextData[0].medical_history_remarks : null;

    contextData.forEach(section => {
      if (section.no_know_history || !section.tags || section.tags.length === 0) {
        return;
      }

      const sectionType = idToTypeMap[section.tmmhs_id] || 'Lifestyle';
      
      const validTags = section.tags.filter(tag => 
        !tag.delete && (tag.enable === 'Y' || tag.enable === 'N')
      );
      
      validTags.forEach(tag => {
        if ((tag.enable === 'Y' || tag.enable === 'N') && tag.title && tag.title.trim() !== '') {
          if (tag.enable === 'N') {
            rxPadArray.push({
              type: sectionType,
              name: tag.title || '',
              enable: 'N',
              lineItem: tag.title || ''
            });
          } else {
            const historyItem = {
              type: sectionType,
              name: tag.title.trim(),
              duration: tag.since || '',
              relation: tag.relationship || '',
              notes: tag.note || '',
              status: tag.status || 'Active',
              enable: tag.enable
            };
            if (section.tmmhs_id === 2 && tag.medication !== undefined) {
              historyItem.medication = tag.medication ?? '';
            }

            if (section.tmmhs_id === 5 && tag.date) {
              historyItem.date = tag.date;
              historyItem.dateType = tag.dateType || 'onlyYear';
            }

            const lineParts = [tag.title.trim()];
            if (section.tmmhs_id === 5 && tag.date) {
              lineParts.push(`Date of Surgery: ${tag.date}`);
            } else if (tag.since) {
              lineParts.push(tag.since);
            }
            if (section.tmmhs_id !== 3 && section.tmmhs_id !== 5) {
              lineParts.push(`Status: ${tag.status || 'Active'}`);
            }
            if (section.tmmhs_id === 2 && tag.medication != null && String(tag.medication).trim() !== '') {
              lineParts.push(`Medication: ${tag.medication}`);
            }
            if (tag.relationship) lineParts.push(`Relation: ${tag.relationship}`);
            if (tag.note) lineParts.push(tag.note);
            historyItem.lineItem = lineParts.join(', ');

            rxPadArray.push(historyItem);
          }
        }
      });
    });

    // Additional History (medical_history_remarks) – save as 'others' items so they appear on Rx pad and are preserved
    if (medicalHistoryRemarks && String(medicalHistoryRemarks).trim()) {
      const remarksParts = String(medicalHistoryRemarks)
        .split('\n')
        .map(part => part.trim())
        .filter(part => part)
        .flatMap(part => part.includes(';') ? part.split(';').map(p => p.trim()).filter(p => p) : [part]);
      remarksParts.forEach(remark => {
        rxPadArray.push({
          type: 'others',
          name: remark,
          enable: 'Y',
          lineItem: remark,
          notes: remark
        });
      });
    }

    return rxPadArray;
  };

  const handleAdditionalHistoryChange = useCallback((remarksText) => {
    if (!setMedicalHistoryData) return;
    const sourceData = mergedMedicalHistoryData?.length ? mergedMedicalHistoryData : medicalHistoryData;
    if (!sourceData || sourceData.length === 0) return;
    const updated = sourceData.map((section, index) => {
      if (index === 0) {
        return { ...section, medical_history_remarks: remarksText };
      }
      return section;
    });
    setMedicalHistoryData(updated);
  }, [mergedMedicalHistoryData, medicalHistoryData, setMedicalHistoryData]);

  const handleAdditionalHistorySave = useCallback((remarksText) => {
    if (!setMedicalHistoryData) return;
    const sourceData = mergedMedicalHistoryData?.length ? mergedMedicalHistoryData : medicalHistoryData;
    if (!sourceData) return;

    const updated = sourceData.map((section, index) => {
      if (index === 0) {
        return {
          ...section,
          medical_history_remarks: remarksText
        };
      }
      return section;
    });

    setMedicalHistoryData(updated);
    
    if (onSave) {
      const rxPadFormat = convertContextToRxPadFormatForSave(updated);
      onSave(rxPadFormat);
    }

    setCurrentSheet('list');
  }, [mergedMedicalHistoryData, medicalHistoryData, setMedicalHistoryData, onSave]);

  const renderEditSheet = () => {
    if (currentSheet !== 'editItem') return null;

    if (editingSectionType === 6) {
      const sourceData = mergedMedicalHistoryData?.length ? mergedMedicalHistoryData : medicalHistoryData;
      const firstSection = sourceData?.[0];
      return (
        <MobileAdditionalHistoryEdit
          visible={true}
          onClose={() => setCurrentSheet('list')}
          remarks={firstSection?.medical_history_remarks || ''}
          onSave={handleAdditionalHistorySave}
        />
      );
    }

    if (!editingItem) return null;

    if (editingSectionType === 3) {
      return (
        <MobileFamilyHistoryItemEdit
          visible={true}
          onClose={() => setCurrentSheet('list')}
          item={{ ...editingItem, relationship: selectedRelationship || editingItem.relationship }}
          onSave={handleItemSave}
          onOpenRelationshipPicker={handleOpenRelationshipPicker}
          selectedRelationship={selectedRelationship}
        />
      );
    }

    if (editingSectionType === 5) {
      return (
        <MobileSurgicalHistoryItemEdit
          visible={true}
          onClose={() => setCurrentSheet('list')}
          item={editingItem}
          onSave={handleItemSave}
        />
      );
    }

    return (
      <MobileMedicalHistoryItemEdit
        visible={true}
        onClose={() => setCurrentSheet('list')}
        item={editingItem}
        sectionType={editingSectionType}
        onSave={handleItemSave}
      />
    );
  };

  return (
    <>
      <MobileMedicalHistorySectionsList
        visible={visible && currentSheet === 'list'}
        onClose={handleClose}
        medicalHistoryData={mergedMedicalHistoryData}
        onNoKnownHistoryChange={handleNoKnownHistoryChange}
        onChipClick={handleChipClick}
        onChipEnableClick={handleChipEnableClick}
        onEditQuickList={handleEditQuickList}
        onSave={handleSave}
        onAdditionalHistoryChange={handleAdditionalHistoryChange}
      />

      <MobileNoConditionScreen
        visible={currentSheet === 'noCondition'}
        onClose={handleClose}
        item={editingItem}
        onSetActive={handleSetActive}
        onBack={() => setCurrentSheet('list')}
      />

      {renderEditSheet()}

      <MobileRelationshipSelect
        visible={currentSheet === 'relationship'}
        onClose={() => setCurrentSheet('editItem')}
        selectedRelationship={selectedRelationship}
        onSelect={handleRelationshipSelect}
      />

      <MobileEditQuickList
        visible={currentSheet === 'editQuickList'}
        onClose={() => setCurrentSheet('list')}
        section={editingSection}
        onSave={handleQuickListSave}
      />
    </>
  );
}

export default MobileMedicalHistoryManager;
