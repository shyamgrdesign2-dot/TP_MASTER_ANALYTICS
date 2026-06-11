/**
 * Slate.js utility functions for converting between Slate format and plain text
 */

/**
 * Convert plain text to Slate.js initial value format
 * @param {string} text - Plain text string
 * @returns {Array} Slate.js compatible array of nodes
 */
export const textToSlateValue = (text) => {
  if (!text || typeof text !== 'string') {
    return [
      {
        type: 'paragraph',
        children: [{ text: '' }],
      },
    ];
  }

  // Split by newlines and create paragraph nodes
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return [
      {
        type: 'paragraph',
        children: [{ text: '' }],
      },
    ];
  }

  return lines.map(line => ({
    type: 'paragraph',
    children: [{ text: line }],
  }));
};

/**
 * Convert Slate.js value to plain text
 * @param {Array} slateValue - Slate.js value array
 * @returns {string} Plain text string
 */
export const slateValueToText = (slateValue) => {
  if (!Array.isArray(slateValue) || slateValue.length === 0) {
    return '';
  }

  const extractText = (node) => {
    if (node.text !== undefined) {
      return node.text;
    }

    if (node.children) {
      return node.children.map(extractText).join('');
    }

    return '';
  };

  return slateValue.map(extractText).join('\n').trim();
};

/**
 * Convert array of symptoms/items to Slate.js format with bullet points
 * @param {Array} items - Array of strings
 * @returns {Array} Slate.js compatible array with bulleted list
 */
export const arrayToSlateBulletList = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [
      {
        type: 'paragraph',
        children: [{ text: '' }],
      },
    ];
  }

  return [
    {
      type: 'bulleted-list',
      children: items.map(item => ({
        type: 'list-item',
        children: [{ text: item }],
      })),
    },
  ];
};

/**
 * Convert Slate.js bulleted list to array of strings
 * @param {Array} slateValue - Slate.js value array
 * @returns {Array} Array of strings
 */
export const slateBulletListToArray = (slateValue) => {
  if (!Array.isArray(slateValue) || slateValue.length === 0) {
    return [];
  }

  const extractItems = (node) => {
    if (node.type === 'bulleted-list' || node.type === 'numbered-list') {
      return node.children.flatMap(extractItems);
    }

    if (node.type === 'list-item') {
      return [node.children.map(child => child.text || '').join('')];
    }

    if (node.type === 'paragraph' && node.children) {
      const text = node.children.map(child => child.text || '').join('').trim();
      return text ? [text] : [];
    }

    return [];
  };

  return slateValue.flatMap(extractItems).filter(item => item.trim() !== '');
};

/**
 * Check if Slate value is empty
 * @param {Array} slateValue - Slate.js value array
 * @returns {boolean} True if empty
 */
export const isSlateValueEmpty = (slateValue) => {
  if (!Array.isArray(slateValue) || slateValue.length === 0) {
    return true;
  }

  const text = slateValueToText(slateValue);
  return text.trim() === '';
};



