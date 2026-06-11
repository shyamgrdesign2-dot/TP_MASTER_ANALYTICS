const SECTION_TITLES = { 1: 'Lifestyle', 2: 'Medical Condition', 3: 'Family History', 4: 'Allergies', 5: 'Surgical History' };

const SECTION_ORDER = [2, 4, 3, 1, 5];

const TYPE_TO_TMMHS_ID = {
  Lifestyle: 1, 'Medical Condition': 2, 'Family History': 3, Allergies: 4, 'Surgical History': 5,
  lifestyle: 1, medical_condition: 2, family_history: 3, allergies: 4, surgical_history: 5,
};

function normalizeTitleForMatch(title) {
  return (title || '').trim().toLowerCase();
}

/**
 * Normalises tag titles within a section so master-list labels (e.g. "Allergies, Nuts") match digitised rows ("Nuts").
 */
export function canonicalTagTitleKey(title, tmmhs_id) {
  let t = normalizeTitleForMatch(title);
  if (!t) return '';
  const id = Number(tmmhs_id);
  if (Number.isNaN(id)) return t;
  if (id === 4) {
    t = t
      .replace(/^allergies?\s*,\s*/i, '')
      .replace(/^food\s+allergies?\s*,\s*/i, '')
      .replace(/^allergy\s*,\s*/i, '')
      .replace(/^allergy\s+to\s+/i, '')
      .trim();
  }
  if (id === 3) {
    t = t.replace(/^family\s*history\s*,\s*/i, '').trim();
  }
  if (id === 2) {
    t = t.replace(/^medical\s*(condition|problem)?\s*,\s*/i, '').trim();
  }
  if (id === 1) {
    t = t.replace(/^lifestyle\s*,\s*/i, '').trim();
  }
  if (id === 5) {
    t = t.replace(/^surgical\s*history\s*,\s*/i, '').trim();
  }
  return t;
}

/** Dedupe tags in a section: same master id, or same canonical title (incl. one with id, one without). */
export function tagsAreDuplicateForHistoryMerge(item1, item2, tmmhs_id) {
  const id1 = item1?.tmmhst_id;
  const id2 = item2?.tmmhst_id;
  const hasId1 = id1 != null && id1 !== '' && id1 !== 0;
  const hasId2 = id2 != null && id2 !== '' && id2 !== 0;
  if (hasId1 && hasId2) return id1 === id2;
  const c1 = canonicalTagTitleKey(item1?.title, tmmhs_id);
  const c2 = canonicalTagTitleKey(item2?.title, tmmhs_id);
  return !!(c1 && c2 && c1 === c2);
}

export function findMatchingMedicalHistoryTag(tag, sourceTags, tmmhs_id) {
  if (!sourceTags?.length) return null;
  const tid = tag?.tmmhst_id;
  if (tid != null && tid !== '' && tid !== 0) {
    const byId = sourceTags.find((x) => x?.tmmhst_id === tid);
    if (byId) return byId;
  }
  const key = canonicalTagTitleKey(tag?.title, tmmhs_id);
  if (!key) return null;
  return sourceTags.find((x) => canonicalTagTitleKey(x?.title, tmmhs_id) === key) ?? null;
}

/** Merge two tag lists for the same section; sb overlays sa. Keys by canonical title so prefixed labels do not duplicate. */
export function mergeMedicalHistoryTagsBySection(saTags, sbTags, tmmhs_id) {
  let unkeyed = 0;
  const keyOf = (t) => {
    const c = canonicalTagTitleKey(t?.title, tmmhs_id);
    if (c) return `canon:${c}`;
    const id = t?.tmmhst_id;
    if (id != null && id !== '' && id !== 0) return `id:${id}`;
    unkeyed += 1;
    return `untitled:${unkeyed}`;
  };
  const map = new Map();
  const push = (t) => {
    const k = keyOf(t);
    const prev = map.get(k);
    map.set(k, prev ? { ...prev, ...t } : { ...t });
  };
  (saTags || []).forEach(push);
  (sbTags || []).forEach(push);
  return Array.from(map.values());
}

function buildTagForCaseManager(tag, tmmhs_id) {
  const title = (tag.title || '').trim();
  const base = {
    tmmhst_id: tag.tmmhst_id != null ? tag.tmmhst_id : 0,
    title,
    pms_default: tag.pms_default !== undefined && tag.pms_default !== null ? tag.pms_default : 0,
    note: tag.note || '',
    enable: tag.enable || 'Y',
  };
  if (tmmhs_id === 3) {
    base.relationship = tag.relationship || '';
  }
  if (tmmhs_id === 1 || tmmhs_id === 2) {
    base.since = tag.since || '';
    base.status = tag.status ?? '';
    base.medication = tag.medication || '';
    base.newSince = tag.newSince || '';
    base.MonthYear = tag.MonthYear || '';
  }
  if (tmmhs_id === 3 || tmmhs_id === 4) {
    base.newSince = tag.newSince || '';
    base.MonthYear = tag.MonthYear || '';
  }
  if (tmmhs_id === 5) {
    base.dateType = tag.dateType || '';
    base.date = tag.date ?? '';
    base.newSince = tag.newSince || '';
    base.MonthYear = tag.MonthYear || '';
  }
  return base;
}


function normalizeSectionToCaseManagerFormat(section) {
  const title = section.title || section.section_name || SECTION_TITLES[section.tmmhs_id] || '';
  const tmmhs_id = section.tmmhs_id;
  const tags = Array.isArray(section.tags)
    ? section.tags.map((t) => buildTagForCaseManager(t, tmmhs_id))
    : [];
  return {
    title,
    tmmhs_id,
    no_know_history: section.no_know_history !== undefined ? section.no_know_history : false,
    tags,
    tmpmh_remarks: section.tmpmh_remarks ?? '',
  };
}

function flatToSections(flatItems) {
  const groupedByType = {};
  flatItems.forEach((item) => {
    const type = item.type || 'Lifestyle';
    const normalizedType = type.toLowerCase().replace(/\s+/g, '_');
    if (normalizedType === 'others' || type === 'others' || type === 'Additional Notes' || normalizedType === 'additional_notes') {
      return;
    }
    const mappedType = TYPE_TO_TMMHS_ID[type] || TYPE_TO_TMMHS_ID[normalizedType] || 1;
    const sectionName = SECTION_TITLES[mappedType] || 'Lifestyle';
    if (!groupedByType[mappedType]) {
      groupedByType[mappedType] = { tmmhs_id: mappedType, section_name: sectionName, tags: [] };
    }
    let tagTitle = item.name || '';
    let tagEnable = item.enable || 'Y';
    if (!item.enable) {
      const nameToCheck = item.name || item.lineItem || '';
      if (nameToCheck.trim().toLowerCase().startsWith('no ')) {
        tagTitle = nameToCheck.trim().substring(3);
        tagEnable = 'N';
      }
    }
    groupedByType[mappedType].tags.push({
      tmmhst_id: null,
      pms_default: undefined,
      title: tagTitle,
      enable: tagEnable,
      note: item.notes || '',
      since: item.duration || '',
      status: item.status ?? '',
      relationship: item.relation || '',
    });
  });
  return Object.values(groupedByType);
}

export function ensureFiveSections(sections) {
  const byId = {};
  (sections || []).forEach((s) => { byId[s.tmmhs_id] = s; });
  return SECTION_ORDER.map((tmmhs_id) => {
    const existing = byId[tmmhs_id];
    const title = SECTION_TITLES[tmmhs_id];
    return existing
      ? { ...existing, tmpmh_remarks: existing.tmpmh_remarks ?? '' }
      : { title, tmmhs_id, no_know_history: false, tags: [], tmpmh_remarks: '' };
  });
}

function toStubSections(medicalHistory) {
  if (!medicalHistory || !Array.isArray(medicalHistory) || medicalHistory.length === 0) {
    return ensureFiveSections([]);
  }
  const first = medicalHistory[0];
  const isSectionFormat = first && (first.tmmhs_id != null) && (first.title != null || first.section_name != null);
  const sections = isSectionFormat ? medicalHistory : flatToSections(medicalHistory);
  const normalized = sections.map((s) => ({
    ...s,
    tags: (s.tags || []).map((t) => ({
      ...t,
      tmmhst_id: t.tmmhst_id ?? null,
      pms_default: t.pms_default,
      unique_id: t.unique_id != null && t.unique_id !== '' ? t.unique_id : undefined,
    })),
  }));
  return ensureFiveSections(normalized);
}

/**
 * Resolve tmmhst_id and pms_default from listSectionwithTag; for tags not in master, searchTag first;
 * if searchTag returns null/empty then addTag (payload includes all tags for that section, same as consult).
 * getSectionsWithTags: () => Promise<array> (listSectionwithTag response data).
 * addTag: (payload) => Promise<{ data }> (addTag response).
 * searchTag: (payload) => Promise (searchTag response; payload = { section_id, keyword }).
 * tmmhs_id and section title are taken from master (listSectionwithTag) when available, same as consult.
 * Returns medical_history in exact backend format: 5 sections, tmpmh_remarks, no synthetic tmmhst_id.
 */
export async function resolveMedicalHistoryForCaseManager(medicalHistory, { getSectionsWithTags, addTag: addTagApi, searchTag: searchTagApi }) {
  const sections = toStubSections(medicalHistory);
  const hasAnyMedicalHistoryData = sections.some((s) => {
    const hasTags = (s.tags || []).length > 0;
    const hasNoKnownHistory = s.no_know_history === true;
    const hasRemarks =
      String(s.tmpmh_remarks || '').trim().length > 0 ||
      String(s.medical_history_remarks || '').trim().length > 0;
    return hasTags || hasNoKnownHistory || hasRemarks;
  });
  if (!hasAnyMedicalHistoryData) {
    return [];
  }

  let master = [];
  try {
    const res = await getSectionsWithTags();
    if (Array.isArray(res)) master = res;
    else if (res?.status && Array.isArray(res.data)) master = res.data;
    else if (Array.isArray(res?.data)) master = res.data;
  } catch (e) {
    console.warn('[resolveMedicalHistoryForCaseManager] getSectionsWithTags failed', e);
  }

  const findMasterSection = (tmmhs_id) => master.find((s) => s.tmmhs_id === tmmhs_id) || null;
  const findMasterTag = (tmmhs_id, title) => {
    const section = findMasterSection(tmmhs_id);
    if (!section?.tags) return null;
    const key = normalizeTitleForMatch(title);
    return section.tags.find((t) => normalizeTitleForMatch(t.title) === key) || null;
  };

  for (const section of sections) {
    const tmmhs_id = section.tmmhs_id;
    for (const tag of section.tags || []) {
      const m = findMasterTag(tmmhs_id, tag.title);
      if (m) {
        tag.tmmhst_id = m.tmmhst_id;
        tag.pms_default = m.pms_default !== undefined && m.pms_default !== null ? m.pms_default : 0;
      } else {
        tag.isNew = true;
      }
    }
  }

  if (typeof searchTagApi === 'function') {
    for (const section of sections) {
      const tmmhs_id = section.tmmhs_id;
      for (const tag of section.tags || []) {
        if (!tag.isNew) continue;
        try {
          const searchRes = await searchTagApi({ section_id: tmmhs_id, keyword: (tag.title || '').trim() });
          const searchData = searchRes?.data ?? searchRes;
          const list = Array.isArray(searchData) ? searchData : (searchData?.tags ? searchData.tags : null) || [];
          if (list.length > 0) {
            const key = normalizeTitleForMatch(tag.title);
            const match = list.find((t) => normalizeTitleForMatch(t.title) === key) || list[0];
            tag.tmmhst_id = match.tmmhst_id;
            tag.pms_default = match.pms_default !== undefined && match.pms_default !== null ? match.pms_default : 0;
            tag.isNew = false;
          }
        } catch (e) {
          console.warn('[resolveMedicalHistoryForCaseManager] searchTag failed for section', tmmhs_id, tag.title, e);
        }
      }
    }
  }

  for (const section of sections) {
    const hasNew = (section.tags || []).some((t) => t.isNew);
    if (!hasNew || !section.tags?.length) continue;
    const masterSection = findMasterSection(section.tmmhs_id);
    const sectionTitle = masterSection?.title || section.title || SECTION_TITLES[section.tmmhs_id];
    const inputTagTitles = new Set((section.tags || []).filter((t) => !t.delete).map((t) => normalizeTitleForMatch(t.title)));
    const tagsFromMaster = (masterSection?.tags || [])
      .filter((t) => !inputTagTitles.has(normalizeTitleForMatch(t.title)))
      .map((t) => ({
        tmmhst_id: t.tmmhst_id ?? 0,
        title: (t.title || '').trim(),
        pms_default: t.pms_default !== undefined && t.pms_default !== null ? t.pms_default : 0,
        unique_id: t.unique_id != null && t.unique_id !== '' ? t.unique_id : undefined,
      }));
    const tagsFromInput = (section.tags || [])
      .filter((t) => !t.delete)
      .map((t) => ({
        tmmhst_id: t.tmmhst_id ?? 0,
        title: (t.title || '').trim(),
        pms_default: t.pms_default !== undefined && t.pms_default !== null ? t.pms_default : 0,
        unique_id: t.unique_id != null && t.unique_id !== '' ? t.unique_id : undefined,
      }));
    const tagsForApi = [...tagsFromInput, ...tagsFromMaster];
    const payload = { tmmhs_id: section.tmmhs_id, title: sectionTitle, tags: tagsForApi };
    try {
      const result = await addTagApi(payload);
      const data = result?.data || result;
      const updatedTags = data?.tags || [];
      for (const tag of section.tags) {
        if (tag.isNew) {
          const match = updatedTags.find((r) => normalizeTitleForMatch(r.title) === normalizeTitleForMatch(tag.title));
          if (match) {
            tag.tmmhst_id = match.tmmhst_id;
            tag.pms_default = match.pms_default !== undefined && match.pms_default !== null ? match.pms_default : 0;
          }
        }
      }
    } catch (e) {
      console.warn('[resolveMedicalHistoryForCaseManager] addTag failed for section', section.tmmhs_id, e);
    }
  }

  const byId = {};
  sections.forEach((section) => {
    const tags = (section.tags || []).map((t) => buildTagForCaseManager(t, section.tmmhs_id));
    byId[section.tmmhs_id] = {
      title: section.title || SECTION_TITLES[section.tmmhs_id],
      tmmhs_id: section.tmmhs_id,
      no_know_history: section.no_know_history !== undefined ? section.no_know_history : false,
      tags,
      tmpmh_remarks: section.tmpmh_remarks ?? '',
    };
  });

  return SECTION_ORDER.map((tmmhs_id) => byId[tmmhs_id] ?? {
    title: SECTION_TITLES[tmmhs_id],
    tmmhs_id,
    no_know_history: false,
    tags: [],
    tmpmh_remarks: '',
  });
}


export function medicalHistoryToCaseManagerFormat(medicalHistory) {
  const sections = toStubSections(medicalHistory);
  return sections.map(normalizeSectionToCaseManagerFormat);
}


export function prescriptionMedicalHistoryToContextFormat(apiMedicalHistory) {
  if (!apiMedicalHistory || !Array.isArray(apiMedicalHistory) || apiMedicalHistory.length === 0) {
    return [];
  }

  const typeToIdMap = {
    Lifestyle: 1,
    'Medical Condition': 2,
    'Family History': 3,
    Allergies: 4,
    'Surgical History': 5,
    lifestyle: 1,
    medical_condition: 2,
    family_history: 3,
    allergies: 4,
    surgical_history: 5
  };

  const groupedByType = {};
  apiMedicalHistory.forEach((item) => {
    const type = item.type || 'Lifestyle';
    const normalizedType = type.toLowerCase().replace(/\s+/g, '_');
    if (normalizedType === 'others' || type === 'others' || type === 'Additional Notes' || normalizedType === 'additional_notes') {
      return;
    }
    const mappedType = typeToIdMap[type] || typeToIdMap[normalizedType] || 1;
    const sectionName =
      type === 'Lifestyle' ? 'Lifestyle' :
      type === 'Medical Condition' || normalizedType === 'medical_condition' ? 'Medical Condition' :
      type === 'Family History' || normalizedType === 'family_history' ? 'Family History' :
      type === 'Allergies' || normalizedType === 'allergies' ? 'Allergies' :
      type === 'Surgical History' || normalizedType === 'surgical_history' ? 'Surgical History' : 'Lifestyle';

    if (!groupedByType[mappedType]) {
      groupedByType[mappedType] = {
        tmmhs_id: mappedType,
        section_name: sectionName,
        tags: []
      };
    }
    let tagTitle = item.name || '';
    let tagEnable = item.enable || 'Y';
    if (!item.enable) {
      const nameToCheck = item.name || item.lineItem || '';
      if (nameToCheck.trim().toLowerCase().startsWith('no ')) {
        tagTitle = nameToCheck.trim().substring(3);
        tagEnable = 'N';
      }
    }
    const tag = {
      tmmhst_id: item.tmmhst_id != null && item.tmmhst_id !== '' ? item.tmmhst_id : null,
      title: tagTitle,
      enable: tagEnable,
      note: item.notes || '',
      since: item.duration || '',
      status: item.status,
      relationship: item.relation || ''
    };
    groupedByType[mappedType].tags.push(tag);
  });

  return Object.values(groupedByType);
}
