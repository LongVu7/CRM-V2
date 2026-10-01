// ─── Centralized Rendering & Variable Validation ───

// Define the absolute source of truth for variables
const AVAILABLE_VARIABLES = [
  'fullName',
  'email',
  'mobile'
];

/**
 * Returns the list of available variables to the frontend.
 */
const getAvailableVariables = () => {
  return AVAILABLE_VARIABLES;
};

/**
 * Validates the content string to ensure no unknown {{variables}} are used.
 * @param {string} content - The template HTML or text
 * @throws {Error} if an unknown variable is found.
 */
const validateContent = (content) => {
  if (!content) return;
  
  const regex = /\{\{([^}]+)\}\}/g;
  let match;
  const unknownVariables = [];

  while ((match = regex.exec(content)) !== null) {
    const varName = match[1].trim();
    if (!AVAILABLE_VARIABLES.includes(varName)) {
      unknownVariables.push(varName);
    }
  }

  if (unknownVariables.length > 0) {
    throw new Error(`Unknown variables found in content: ${unknownVariables.join(', ')}`);
  }
};

/**
 * Replaces valid {{variables}} with actual data.
 * @param {string} content - The template HTML or text
 * @param {Object} dataObj - The data dictionary e.g. { fullName: 'John Doe', email: 'x@y.com' }
 * @returns {string} The rendered content
 */
const renderContent = (content, dataObj) => {
  if (!content) return '';
  
  let rendered = content;
  AVAILABLE_VARIABLES.forEach(variable => {
    const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
    const replacement = dataObj[variable] || '';
    rendered = rendered.replace(regex, replacement);
  });
  
  return rendered;
};

module.exports = {
  getAvailableVariables,
  validateContent,
  renderContent,
  AVAILABLE_VARIABLES
};
