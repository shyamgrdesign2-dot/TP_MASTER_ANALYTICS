export const STANDARD_TEMPLATE_TITLE_PATTERN = /^(mission\s*hos|mission2|standard(\s+template)?)$/i;

/** Public URL for a file row from custom-smart-sync-pad (API field names vary). */
export const getUploadedFilePublicUrl = (file) => {
  if (!file || typeof file !== "object") return null;
  return (
    file.file_url ||
    file.url ||
    file.fileUrl ||
    file.image_url ||
    file.s3_url ||
    null
  );
};

/**
 * Templates that get the Mission-style patient header composited on top of uploaded letterheads.
 * Match is intentionally forgiving: strict regex first, then word-boundary / known substrings so
 * renamed titles (e.g. "Mission Hos — OPD") still use the generator instead of a raw image URL.
 */
export const isStandardTemplate = (template) => {
  if (!template) return false;
  if (template.id === "standard" || template.isStandardTemplate === true) return true;

  const raw = String(
    template.title ?? template.template_title ?? template.name ?? ""
  )
    .replace(/\u00a0/g, " ")
    .trim();
  if (!raw) return false;

  if (STANDARD_TEMPLATE_TITLE_PATTERN.test(raw)) return true;

  const collapsed = raw.replace(/\s+/g, " ");
  const lower = collapsed.toLowerCase();

  if (/\bmission2\b/i.test(collapsed)) return true;
  if (/\bmission\s*hos\b/i.test(collapsed)) return true;
  if (lower === "standard" || lower === "standard template") return true;

  return false;
};

export const resolveSelectedTemplateById = (templateId, templates = []) => {
  if (!templateId || templateId === "none") return null;
  const selectedTemplate = templates.find((template) => template.id === templateId);
  if (selectedTemplate) return selectedTemplate;
  if (templateId === "standard") {
    return {
      id: "standard",
      title: "Standard Template",
      isStandardTemplate: true,
    };
  }
  return null;
};

export const resolveTemplatePageSources = async ({
  template,
  profile,
  patientData,
  generateMissionHosTemplateBackground,
  forceBlankAddress = true,
  outputWidth = 720,
  outputHeight = 980,
}) => {
  if (!template) return [];

  if (isStandardTemplate(template)) {
    const standardTemplateFiles = Array.isArray(template?.uploaded_files)
      ? template.uploaded_files
      : [];
    const standardTemplatePageCount = Math.max(standardTemplateFiles.length, 1);
    const indices = Array.from({ length: standardTemplatePageCount }, (_, i) => i);
    return Promise.all(
      indices.map((index) => {
        const backgroundImageSrc = getUploadedFilePublicUrl(
          standardTemplateFiles[index]
        );
        return generateMissionHosTemplateBackground(profile, patientData, {
          forceBlankAddress,
          outputWidth,
          outputHeight,
          backgroundImageSrc,
        });
      })
    );
  }

  if (Array.isArray(template.uploaded_files)) {
    return template.uploaded_files
      .map((file) => getUploadedFilePublicUrl(file))
      .filter(Boolean);
  }

  return [];
};
