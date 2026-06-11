/**
 * Utility functions for managing Snap RX session IDs
 */

/**
 * Generate a unique session ID
 * @returns {string} - Unique session ID
 */
export const generateSessionId = () => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `ophthal_snaprx_${timestamp}_${randomPart}`;
};

/**
 * Store session ID in sessionStorage
 * @param {string} sessionId - Session ID to store
 */
let inMemorySessionId = null;

/**
 * Get session ID from sessionStorage
 * @returns {string|null} - Stored session ID or null
 */
export const getStoredSessionId = () => inMemorySessionId;

/**
 * Clear session ID from sessionStorage
 */
export const clearSessionId = () => {
  inMemorySessionId = null;
};

/**
 * Get or create session ID
 * @returns {string} - Current or newly created session ID
 */
export const getOrCreateSessionId = () => {
  if (!inMemorySessionId) {
    inMemorySessionId = generateSessionId();
  }
  return inMemorySessionId;
};
