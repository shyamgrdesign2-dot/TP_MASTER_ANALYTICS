const MEDICAL_HISTORY_SECTION_TITLES = {
  1: 'Lifestyle',
  2: 'Medical Condition',
  3: 'Family History',
  4: 'Allergies',
  5: 'Surgical History'
};

const MEDICAL_HISTORY_TYPE_TO_ID = {
  'Lifestyle': 1,
  'Medical Condition': 2,
  'Family History': 3,
  'Allergies': 4,
  'Surgical History': 5,
  'lifestyle': 1,
  'medical_condition': 2,
  'family_history': 3,
  'allergies': 4,
  'allergy': 4,
  'surgical_history': 5,
  'past': 2,
  'past_history': 2,
  'past_medical_history': 2,
  'medical': 2,
  'condition': 2,
  'medical_history': 2,
  'family': 3,
  'surgery': 5,
  'other': 1,
  'others': 1
};

const AGENT_MEDICAL_HISTORY_TYPE_TO_TITLE = {
  allergy: 'Allergies',
  allergies: 'Allergies',
  past: 'Medical Condition',
  past_history: 'Medical Condition',
  past_medical_history: 'Medical Condition',
  medical: 'Medical Condition',
  condition: 'Medical Condition',
  medical_condition: 'Medical Condition',
  medical_history: 'Medical Condition',
  family: 'Family History',
  family_history: 'Family History',
  lifestyle: 'Lifestyle',
  others: 'Lifestyle',
  other: 'Lifestyle',
  surgery: 'Surgical History',
  surgical_history: 'Surgical History'
};

function normalizeMedicalHistoryTypeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function normalizeMedicalHistoryEnable(value, fallback = 'Y') {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return fallback;
  if (['y', 'yes', 'true', 'active', 'inactive', 'present', 'positive'].includes(key)) return 'Y';
  if (['n', 'no', 'false', 'absent', 'negative'].includes(key)) return 'N';
  return value;
}

export function statusFromMedicalHistoryEnable(value) {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'active') return 'Active';
  if (key === 'inactive') return 'Inactive';
  return '';
}

export function medicalHistoryTitleFromAgentType(type) {
  const key = normalizeMedicalHistoryTypeKey(type);
  return AGENT_MEDICAL_HISTORY_TYPE_TO_TITLE[key] || 'Medical Condition';
}

function medicalHistorySectionNameFromType(type, mappedType) {
  return MEDICAL_HISTORY_SECTION_TITLES[mappedType] || medicalHistoryTitleFromAgentType(type);
}

function medicalHistorySectionIdFromType(type, fallback = 2) {
  const key = normalizeMedicalHistoryTypeKey(type);
  return MEDICAL_HISTORY_TYPE_TO_ID[type] || MEDICAL_HISTORY_TYPE_TO_ID[key] || fallback;
}

function firstMedicalHistoryTextValue(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeAgentMedicalHistoryTag(row = {}) {
  let title = firstMedicalHistoryTextValue(row.title, row.name, row.lineItem);
  if (!title) return null;

  const hasEnable = row.enable !== undefined && row.enable !== null && String(row.enable).trim() !== '';
  let enable = normalizeMedicalHistoryEnable(row.enable, 'Y');
  if (!hasEnable && title.toLowerCase().startsWith('no ')) {
    title = title.substring(3).trim();
    enable = 'N';
  }

  const tag = {
    ...row,
    title,
    enable,
    note: row.note || row.notes || '',
    notes: row.notes || row.note || '',
    since: row.since || row.duration || '',
    relationship: row.relationship || row.relation || '',
    medication: row.medication || '',
    status: row.status || statusFromMedicalHistoryEnable(row.enable),
    dateType: row.dateType || '',
    date: row.date || ''
  };

  return tag;
}

/**
 * Converts current agents/module medical_history output into section-shaped data
 * consumed by MedicalHistoryBox. Flat rows are grouped by backend type; already
 * section-shaped rows are passed through with normalized tags.
 */
export function convertAgentMedicalHistoryRowsToSections(rows = []) {
  if (!Array.isArray(rows)) return [];

  const sections = new Map();
  const normalizedSections = [];

  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;

    if (Array.isArray(row.tags)) {
      const title = row.title || row.section_name || row.section || medicalHistoryTitleFromAgentType(row.type);
      const sectionId = row.tmmhs_id || medicalHistorySectionIdFromType(title);
      const sectionName = medicalHistorySectionNameFromType(title, sectionId);
      const tags = row.tags
        .map((tag) => normalizeAgentMedicalHistoryTag(tag))
        .filter(Boolean);
      if (row.no_know_history || tags.length || row.medical_history_remarks) {
        normalizedSections.push({
          ...row,
          tmmhs_id: sectionId,
          title: sectionName,
          section_name: sectionName,
          no_know_history: Boolean(row.no_know_history),
          tags
        });
      }
      return;
    }

    const tag = normalizeAgentMedicalHistoryTag(row);
    if (!tag) return;
    const sectionId = medicalHistorySectionIdFromType(row.type);
    const sectionName = medicalHistorySectionNameFromType(row.type, sectionId);
    if (!sections.has(sectionId)) {
      sections.set(sectionId, {
        tmmhs_id: sectionId,
        title: sectionName,
        section_name: sectionName,
        no_know_history: false,
        tags: []
      });
    }
    sections.get(sectionId).tags.push(tag);
  });

  return [...normalizedSections, ...Array.from(sections.values())];
}

/**
 * Converts Rx Pad / API medical history format to CashManagerContext format
 * for use in MedicalHistoryBox. Input: [{ type, name, lineItem, since?, status?, relation?, notes?, duration?, enable? }]
 * Output: [{ tmmhs_id, section_name, title, tags: [{ tmmhst_id, title, enable, note, since, status, relationship }] }]
 * @param {Array} apiMedicalHistory - Medical history from API/Rx pad
 * @param {Array} existingContextData - Existing context data to merge with
 * @returns {Array} Context-format array for setMedicalHistoryData
 */
export function convertMedicalHistoryToContextFormat(apiMedicalHistory, existingContextData) {
  if (!apiMedicalHistory || !Array.isArray(apiMedicalHistory) || apiMedicalHistory.length === 0) {
    return existingContextData || [];
  }

  if (apiMedicalHistory.some((item) => Array.isArray(item?.tags))) {
    const normalizedSections = convertAgentMedicalHistoryRowsToSections(apiMedicalHistory);
    const noKnownByTitle = new Map();
    const flattenedItems = [];

    normalizedSections.forEach((section) => {
      const sectionType = section.title || section.section_name || section.type || 'Medical Condition';
      if (section.no_know_history) {
        noKnownByTitle.set(sectionType, true);
      }
      if (section.medical_history_remarks) {
        flattenedItems.push({
          type: 'additional_notes',
          name: section.medical_history_remarks,
          lineItem: section.medical_history_remarks,
          notes: section.medical_history_remarks
        });
      }
      (section.tags || []).forEach((tag) => {
        flattenedItems.push({
          ...tag,
          type: sectionType,
          name: tag.title || tag.name || tag.lineItem || '',
          notes: tag.notes || tag.note || '',
          duration: tag.duration || tag.since || '',
          relation: tag.relation || tag.relationship || '',
          enable: tag.enable,
          status: tag.status,
          medication: tag.medication,
          date: tag.date,
          dateType: tag.dateType
        });
      });
    });

    const converted = flattenedItems.length
      ? convertMedicalHistoryToContextFormat(flattenedItems, existingContextData)
      : (Array.isArray(existingContextData) ? [...existingContextData] : []);

    noKnownByTitle.forEach((isNoKnown, sectionType) => {
      if (!isNoKnown) return;
      const normalizedType = normalizeMedicalHistoryTypeKey(sectionType);
      const mappedType = MEDICAL_HISTORY_TYPE_TO_ID[sectionType] || MEDICAL_HISTORY_TYPE_TO_ID[normalizedType] || 2;
      const sectionName = medicalHistorySectionNameFromType(sectionType, mappedType);
      const existingSection = converted.find((section) => Number(section?.tmmhs_id) === Number(mappedType));
      if (existingSection) {
        existingSection.no_know_history = true;
      } else {
        converted.push({
          tmmhs_id: mappedType,
          section_name: sectionName,
          title: sectionName,
          no_know_history: true,
          tags: []
        });
      }
    });

    return converted;
  }

  const groupedByType = {};
  const additionalNotesItems = [];
  
  apiMedicalHistory.forEach((item) => {
    const type = item.type || 'Lifestyle';
    const normalizedType = normalizeMedicalHistoryTypeKey(type);
    if (normalizedType === 'others' || type === 'others' || type === 'Additional Notes' || normalizedType === 'additional_notes') {
      let noteText = '';
      if (item.lineItem && item.lineItem.trim()) {
        noteText = item.lineItem.trim();
      } else if (item.notes && item.notes.trim()) {
        const namePart = item.name ? `${item.name}` : '';
        const notesPart = item.notes ? ` (Notes: ${item.notes})` : '';
        noteText = namePart + notesPart;
      } else if (item.name && item.name.trim()) {
        noteText = item.name.trim();
      }
      let trimmedNote = noteText.trim();
      trimmedNote = trimmedNote.replace(/^others[, ]+/i, '').trim();
      if (trimmedNote && trimmedNote.toLowerCase() !== 'others') {
        additionalNotesItems.push(trimmedNote);
      }
      return;
    }
    const mappedType = MEDICAL_HISTORY_TYPE_TO_ID[type] || MEDICAL_HISTORY_TYPE_TO_ID[normalizedType] || 1;
    const sectionName = medicalHistorySectionNameFromType(type, mappedType);

    if (!groupedByType[mappedType]) {
      groupedByType[mappedType] = {
        tmmhs_id: mappedType,
        section_name: sectionName,
        title: sectionName,
        tags: []
      };
    }
    let tagTitle = item.name || '';
    const hasExplicitEnable = item.enable !== undefined && item.enable !== null && String(item.enable).trim() !== '';
    let tagEnable = hasExplicitEnable
      ? normalizeMedicalHistoryEnable(item.enable)
      : item.enable;
    
    // Handle "No [condition]" pattern (takes priority)
    if (!hasExplicitEnable) {
      const nameToCheck = item.name || item.lineItem || '';
      if (nameToCheck.trim().toLowerCase().startsWith('no ')) {
        tagTitle = nameToCheck.trim().substring(3);
        tagEnable = 'N';
      } else {
        // If enable is not present and not "No [condition]", use 'Y' as default
        // This handles legacy data or AI-generated data without explicit enable
        tagEnable = 'Y';
      }
    }

    const normalizedTitle = tagTitle.trim().toLowerCase();
    const existingTagIndex = groupedByType[mappedType].tags.findIndex((t) => t.title?.trim().toLowerCase() === normalizedTitle);

    if (existingTagIndex !== -1) {
      // Update existing tag - always preserve enable status from Rx pad if explicitly provided
      // This ensures 'N' status from Rx pad is correctly preserved during conversion
      const existingTag = groupedByType[mappedType].tags[existingTagIndex];
      if (tagEnable !== undefined && tagEnable !== null) {
        // Always update enable if Rx pad explicitly provides it (even if same value)
        // This ensures 'N' status from Rx pad overwrites any default values
        existingTag.enable = tagEnable;
      }
      const incomingNote = item.notes || item.note;
      const incomingDuration = item.duration || item.since;
      const incomingStatus = item.status || statusFromMedicalHistoryEnable(item.enable);
      const incomingRelationship = item.relation || item.relationship;
      if (incomingNote && !existingTag.note) {
        existingTag.note = incomingNote;
      }
      if (incomingDuration && !existingTag.since) {
        existingTag.since = incomingDuration;
      }
      if (incomingStatus && !existingTag.status) {
        existingTag.status = incomingStatus;
      }
      if (item.medication !== undefined && item.medication !== null) {
        existingTag.medication = item.medication;
      }
      if (incomingRelationship) {
        existingTag.relationship = incomingRelationship;
      }
    } else {
      // Create new tag with proper enable status
      const tag = {
        tmmhst_id: item.tmmhst_id !== undefined && item.tmmhst_id !== null ? item.tmmhst_id : Date.now() + Math.random(),
        title: tagTitle,
        enable: tagEnable,
        pms_default: item.pms_default,
        note: item.notes || item.note || '',
        since: item.duration || item.since || '',
        status: item.status || statusFromMedicalHistoryEnable(item.enable) || 'Active',
        relationship: item.relation || item.relationship || ''
      };
      if (item.medication !== undefined && item.medication !== null) {
        tag.medication = item.medication;
      }
      
      // Surgical History (tmmhs_id 5) uses 'date' and 'dateType' instead of 'since'
      if (mappedType === 5 && item.date) {
        tag.date = item.date;
        tag.dateType = item.dateType || 'onlyYear';
        tag.since = ''; // Surgical history doesn't use 'since'
      }
      
      groupedByType[mappedType].tags.push(tag);
    }
  });

  const medicalHistoryDataArray = Object.values(groupedByType);
  
  const filteredAdditionalNotes = additionalNotesItems
    .map(item => {
      let cleaned = item.trim();
      cleaned = cleaned.replace(/^others[, ]+/i, '').trim();
      cleaned = cleaned.replace(/[, ]+others[, ]*/gi, ',').trim();
      cleaned = cleaned.replace(/^[, ]+|[, ]+$/g, '').trim();
      if (cleaned.toLowerCase() === 'others') {
        return null;
      }
      return cleaned;
    })
    .filter(item => item && item.length > 0);
  
  const medicalHistoryRemarks = filteredAdditionalNotes.length > 0 
    ? filteredAdditionalNotes.join('\n') 
    : null;

  if (medicalHistoryDataArray.length > 0 && medicalHistoryRemarks) {
    medicalHistoryDataArray[0].medical_history_remarks = medicalHistoryRemarks;
  }

  if (existingContextData && existingContextData.length > 0) {
    const merged = existingContextData.map((existingSection) => {
      const apiSection = groupedByType[existingSection.tmmhs_id];
      if (apiSection) {
        const existingTagsMap = new Map();
        (existingSection.tags || []).forEach((tag) => {
          const normalizedTitle = tag.title?.trim().toLowerCase();
          if (normalizedTitle) {
            existingTagsMap.set(normalizedTitle, tag);
          }
        });
        const updatedTags = [...(existingSection.tags || [])];
        apiSection.tags.forEach((newTag) => {
          const normalizedTitle = newTag.title?.trim().toLowerCase();
          const existingTag = existingTagsMap.get(normalizedTitle);

          if (existingTag) {
            const existingIndex = updatedTags.findIndex((t) => t.title?.trim().toLowerCase() === normalizedTitle);
            if (existingIndex !== -1) {
              const existingIsDash = existingTag.enable === undefined || existingTag.enable === '-' || existingTag.enable === '';
              if (existingIsDash) {
                updatedTags[existingIndex].enable = newTag.enable;
              } else if (existingTag.enable === 'N' && newTag.enable === 'Y') {
                // Existing has 'N', new has 'Y' - likely newTag was defaulted, preserve 'N'
                updatedTags[existingIndex].enable = existingTag.enable;
              } else if (newTag.enable === 'N') {
                updatedTags[existingIndex].enable = newTag.enable;
              } else if (newTag.enable !== existingTag.enable) {
                updatedTags[existingIndex].enable = newTag.enable;
              }
              if (newTag.note && !updatedTags[existingIndex].note) {
                updatedTags[existingIndex].note = newTag.note;
              }
              // Surgical History (tmmhs_id 5) uses 'date' instead of 'since'
              // Update date/dateType if Rx pad has explicit values (preserve existing if Rx pad doesn't have them)
              if (existingSection.tmmhs_id === 5) {
                if (newTag.date) {
                  updatedTags[existingIndex].date = newTag.date;
                }
                if (newTag.dateType) {
                  updatedTags[existingIndex].dateType = newTag.dateType;
                }
              } else {
                // For other sections, update 'since' if Rx pad has it
                if (newTag.since) {
                  updatedTags[existingIndex].since = newTag.since;
                }
              }
              // Update relationship if Rx pad has it (Family History)
              if (newTag.relationship) {
                updatedTags[existingIndex].relationship = newTag.relationship;
              }
              // Update status if Rx pad has it
              if (newTag.status) {
                updatedTags[existingIndex].status = newTag.status;
              }
            }
          } else {
            updatedTags.push(newTag);
          }
        });

        return {
          ...existingSection,
          tags: updatedTags
        };
      }
      return existingSection;
    });

    Object.values(groupedByType).forEach((apiSection) => {
      if (!merged.find((s) => s.tmmhs_id === apiSection.tmmhs_id)) {
        merged.push(apiSection);
      }
    });


    if (merged.length > 0) {
      if (medicalHistoryRemarks) {
        merged[0].medical_history_remarks = medicalHistoryRemarks;
      } else if (existingContextData[0]?.medical_history_remarks) {
        merged[0].medical_history_remarks = existingContextData[0].medical_history_remarks;
      }
    }

    return merged;
  }
  return medicalHistoryDataArray;
}

/**
 * Converts CashManagerContext format back to Rx Pad format
 * for display in MedicalHistoryRichTextEditor when prescriptionData.medicalHistory is empty
 * Input: [{ tmmhs_id, section_name, title, no_know_history?, tags: [{ title, enable, since, relationship, note }] }]
 * Output: [{ type, name, enable, duration, relation, notes, lineItem }]
 * @param {Array} contextMedicalHistory - Medical history from context
 * @returns {Array} Rx pad format array
 */
export function convertContextToRxPadFormat(contextMedicalHistory) {
  if (!contextMedicalHistory || !Array.isArray(contextMedicalHistory) || contextMedicalHistory.length === 0) {
    return [];
  }

  const idToTypeMap = {
    1: 'lifestyle',
    2: 'medical_condition',
    3: 'family_history',
    4: 'allergies',
    5: 'surgical_history'
  };

  const rxPadArray = [];
  let medicalHistoryRemarks = null;
  
  contextMedicalHistory.forEach((section, index) => {
    if (index === 0 && section.medical_history_remarks) {
      medicalHistoryRemarks = section.medical_history_remarks;
    }
    
    if (section.no_know_history || !section.tags || section.tags.length === 0) {
      return;
    }

    const type = idToTypeMap[section.tmmhs_id] || 'others';
    
    section.tags.forEach(tag => {
      if (tag.enable === 'N') {
        rxPadArray.push({
          type: type,
          name: tag.title || '',
          enable: 'N',
          lineItem: tag.title || ''
        });
      } else {
        const parts = [];
        if (tag.title) parts.push(tag.title);
        
        // Surgical History (tmmhs_id 5) uses 'date' instead of 'since'
        if (section.tmmhs_id === 5) {
          if (tag.date) parts.push(`Date of Surgery: ${tag.date}`);
        } else {
          if (tag.since) parts.push(`Since: ${tag.since}`);
        }
        
        if (section.tmmhs_id !== 3 && section.tmmhs_id !== 5) {
          parts.push(`Status: ${tag.status || 'Active'}`);
        }
        if (section.tmmhs_id === 2 && tag.medication != null && String(tag.medication).trim() !== '') {
          parts.push(`Medication: ${tag.medication}`);
        }
        if (tag.relationship) parts.push(`Relation: ${tag.relationship}`);
        if (tag.note) parts.push(`Notes: ${tag.note}`);
        
        const rxItem = {
          type: type,
          name: tag.title || '',
          enable: tag.enable || 'Y',
          duration: tag.since || '',
          relation: tag.relationship || '',
          notes: tag.note || '',
          lineItem: parts.length > 1 ? `${parts[0]} (${parts.slice(1).join(' | ')})` : (parts[0] || '')
        };
        if (section.tmmhs_id !== 3 && section.tmmhs_id !== 5) {
          rxItem.status = tag.status || 'Active';
        }
        if (section.tmmhs_id === 2 && tag.medication != null) {
          rxItem.medication = tag.medication;
        }
        
        if (section.tmmhs_id === 5 && tag.date) {
          rxItem.date = tag.date;
          rxItem.dateType = tag.dateType || 'onlyYear';
        }
        
        rxPadArray.push(rxItem);
      }
    });
  });
  
  if (medicalHistoryRemarks) {
    const remarksParts = medicalHistoryRemarks
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
}
