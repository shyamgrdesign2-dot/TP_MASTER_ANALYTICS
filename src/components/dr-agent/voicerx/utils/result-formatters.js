function humanize(key) {
	return key
		.replace(/_/g, ' ')
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (c) => c.toUpperCase())
		.trim();
}

function cleanValue(value) {
	if (value == null) return '';
	const text = String(value).trim();
	if (!text || text === 'null' || text === 'undefined') return '';
	return text;
}

function firstValue(data, keys) {
	for (const key of keys) {
		const value = cleanValue(data?.[key]);
		if (value) return value;
	}
	return '';
}

function detailFrom(values) {
	return values.map(cleanValue).filter(Boolean).join(', ');
}

function sectionItem(name, detail = '') {
	return { name: cleanValue(name), detail: cleanValue(detail) };
}

function isDisabledEntry(data) {
	const value = cleanValue(data?.enable ?? data?.enabled);
	return value.toUpperCase() === 'N';
}

function displayNameForEntry(data, keys) {
	const name = firstValue(data, keys);
	if (!name || !isDisabledEntry(data)) return name;
	return /^no\b/i.test(name) ? name : `No ${name}`;
}

function asArray(value) {
	if (Array.isArray(value)) return value;
	return cleanValue(value) ? [value] : [];
}

function field(data, camelKey, snakeKey) {
	return data?.[camelKey] ?? data?.[snakeKey];
}

function kvSectionItems(obj, keyOrder) {
	if (!obj) return [];
	const keys = keyOrder ?? Object.keys(obj);
	return keys
		.map((k) => {
			const v = obj?.[k];
			if (v == null || v === '') return null;
			return `${humanize(k)}: ${v}`;
		})
		.filter(Boolean);
}

function arraySectionItems(arr, formatter) {
	const items = asArray(arr);
	if (!items.length) return [];
	return items
		.map((it) => formatter(it))
		.filter((item) => {
			if (!item) return false;
			if (typeof item === 'string') return String(item).trim();
			return cleanValue(item.name) || cleanValue(item.detail);
		});
}

export function digitizationToSections(data) {
	if (!data) return [];
	const sections = [];

	const vitals = field(data, 'vitalsAndBodyComposition', 'vitals_and_body_composition');
	const items1 = kvSectionItems(vitals);
	if (items1.length) sections.push({ id: 'vitals', title: 'Vitals & Body Composition', tpIconName: 'vitals', items: items1 });

	const items2 = arraySectionItems(data.symptoms, (s) => {
		if (typeof s === 'string') return sectionItem(s);
		const name = displayNameForEntry(s, ['name', 'symptom_name', 'lineItem']);
		const detail = detailFrom([
			s.since,
			s.duration,
			s.severity,
			s.notes,
			s.note,
		]);
		return sectionItem(name, detail);
	});
	if (items2.length) sections.push({ id: 'symptoms', title: 'Symptoms', tpIconName: 'symptoms', items: items2 });

	const items3 = arraySectionItems(data.examinations, (e) => {
		if (typeof e === 'string') return sectionItem(e);
		const name = displayNameForEntry(e, ['name', 'examination_name', 'findings', 'lineItem']);
		const detail = detailFrom([e.notes, e.note]);
		return sectionItem(name, detail);
	});
	if (items3.length) sections.push({ id: 'examinations', title: 'Examination', tpIconName: 'examination', items: items3 });

	const items4 = arraySectionItems(data.diagnosis, (d) => {
		if (typeof d === 'string') return sectionItem(d);
		const name = displayNameForEntry(d, ['name', 'tds_name', 'diagnosis_name', 'lineItem']);
		const detail = detailFrom([
			d.since,
			d.status,
			d.notes,
			d.note,
		]);
		return sectionItem(name, detail);
	});
	if (items4.length) sections.push({ id: 'diagnosis', title: 'Diagnosis', tpIconName: 'diagnosis', items: items4 });

	const items5 = arraySectionItems(data.medications, (m) => {
		if (typeof m === 'string') return sectionItem(m);
		const dosage = firstValue(m, ['dosage', 'dose', 'tmm_dosage']);
		const unit = firstValue(m, ['unit', 'tmm_unit']);
		const dosageText = [dosage, unit].filter(Boolean).join(' ');
		const duration = firstValue(m, ['duration', 'tmm_days']);
		const durationType = firstValue(m, ['durationType', 'tmm_duration_type', 'tmm_days_duration_type']);
		const durationText = [duration, durationType].filter(Boolean).join(' ');
		const name = displayNameForEntry(m, ['name', 'medicine', 'medicine_name', 'tmm_medicine_name']);
		const detail = detailFrom([
			dosageText,
			m.frequency,
			m.schedule,
			m.tmm_dosage_frequency,
			m.tmm_freq_type_name,
			m.when,
			m.time,
			m.tmm_time_name,
			durationText,
			m.notes,
			m.note,
		]);
		return sectionItem(name, detail);
	});
	if (items5.length) sections.push({ id: 'medications', title: 'Med (Rx)', tpIconName: 'medication', items: items5 });

	const medicalHistory = field(data, 'medicalHistory', 'medical_history');
	const items6 = arraySectionItems(medicalHistory, (h) => {
		if (typeof h === 'string') return sectionItem(h);
		const name = displayNameForEntry(h, ['name', 'history_name', 'lineItem']);
		const detail = detailFrom([h.type, h.duration, h.relation, h.notes, h.note]);
		return sectionItem(name, detail);
	});
	if (items6.length) sections.push({ id: 'medical-history', title: 'Medical History', tpIconName: 'medicalHistory', items: items6 });

	const labInvestigation = field(data, 'labInvestigation', 'lab_investigation');
	const items7 = arraySectionItems(labInvestigation, (l) => {
		if (typeof l === 'string') return sectionItem(l);
		const name = displayNameForEntry(l, ['name', 'investigation_name', 'testname', 'testName', 'lineItem']);
		const detail = detailFrom([l.instruction, l.notes, l.note]);
		return sectionItem(name, detail);
	});
	if (items7.length) sections.push({ id: 'lab-investigation', title: 'Lab Investigation', tpIconName: 'lab', items: items7 });

	const advice = asArray(data.advice).filter((a) => a != null && String(a).trim());
	if (advice.length) {
		sections.push({
			id: 'advice',
			title: 'Advice',
			tpIconName: 'advice',
			items: advice.map((a) => {
				if (typeof a === 'string') return sectionItem(a);
				return sectionItem(
					displayNameForEntry(a, ['advice_name', 'name', 'lineItem']),
					detailFrom([a.notes, a.note])
				);
			}),
		});
	}

	const followUp = field(data, 'followUp', 'follow_up');
	if (followUp != null && String(followUp).trim()) {
		sections.push({ id: 'follow-up', title: 'Follow Up', tpIconName: 'followup', items: [sectionItem(followUp)] });
	}

	const others = asArray(data.others).filter((o) => o != null && String(o).trim());
	if (others.length) {
		sections.push({
			id: 'others',
			title: 'Additional Notes',
			tpIconName: 'notes',
			items: others.map((o) => sectionItem(typeof o === 'string' ? o : displayNameForEntry(o, ['value', 'name', 'lineItem']))),
		});
	}

	return sections;
}
