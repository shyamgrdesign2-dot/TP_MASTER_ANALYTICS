// A4 Dimensions at approx 96 DPI for screen rendering baseline
// A4 is 210mm x 297mm. 
// Aspect Ratio: 1.414
export const A4_BASE_WIDTH = 794; 
export const A4_BASE_HEIGHT = 1123; 

export const ZOOM_CONSTRAINTS = {
  MIN: 0.3, // 30% — allows seeing full page height + action buttons on small / multi-page layouts
  MAX: 1.5, // 150% max zoom (prod requirement)
  WARN: 1.5
};

export const CLINICAL_COLORS = [
  { name: 'Black',      hex: '#000000' },
  { name: 'Grey',       hex: '#545460' }, // Brighter standard blue
  { name: 'LightGrey',        hex: '#A2A2A8' },
  { name: 'Red',      hex: '#EF4444' },
  { name: 'Yellow',    hex: '#F59E0B' }, // Updated to New Primary
  { name: 'Green',       hex: '#10B981' }, // Brand Pink
];

export const HIGHLIGHTER_COLORS = [
  { name: 'Yellow',      hex: '#FCD34D' },
  { name: 'Pint',       hex: '#FCA5A5' }, // Brighter standard blue
  { name: 'Green',        hex: '#86EFAC' },
  { name: 'Grey',      hex: '#94A3B8' },
  { name: 'LightGrey',    hex: '#D1D5DB' }, // Updated to New Primary
  { name: 'White',       hex: '#E5E7EB' }
];

export const THICKNESS_LEVELS = [1, 2, 4, 8, 14, 24];
