/**
 * dev-codes.net
 * A collection of helpful code utilities for developers
 * @author ARD0NIZ
 */

/**
 * Helper utilities for common development tasks
 */
const helpers = {
  /**
   * Greet a user with a personalized message
   * @param {string} name - The name of the person to greet
   * @returns {string} A greeting message
   */
  greet: function(name) {
    return `Hello, ${name}! Welcome to dev-codes.net`;
  },

  /**
   * Format a date to a readable string
   * @param {Date} date - The date to format
   * @returns {string} Formatted date string
   */
  formatDate: function(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  },

  /**
   * Capitalize the first letter of a string
   * @param {string} str - The string to capitalize
   * @returns {string} Capitalized string
   */
  capitalize: function(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Generate a random number within a range
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @returns {number} Random number within range
   */
  randomInt: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Debounce a function to limit execution frequency
   * @param {Function} func - The function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Deep clone an object
   * Note: This method uses JSON serialization and won't preserve functions, 
   * undefined values, Dates, RegExp, or handle circular references.
   * For simple objects with primitive values only.
   * @param {Object} obj - The object to clone (should contain only JSON-serializable values)
   * @returns {Object} Cloned object
   */
  deepClone: function(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Check if a value is empty (null, undefined, empty string, empty array, or empty object)
   * @param {*} value - The value to check
   * @returns {boolean} True if empty, false otherwise
   */
  isEmpty: function(value) {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  /**
   * Sleep/delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after the delay
   */
  sleep: function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

/**
 * String manipulation utilities
 */
const stringUtils = {
  /**
   * Convert string to camelCase
   * @param {string} str - The string to convert
   * @returns {string} camelCase string
   */
  toCamelCase: function(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => 
        index === 0 ? letter.toLowerCase() : letter.toUpperCase()
      )
      .replace(/\s+/g, '');
  },

  /**
   * Convert string to snake_case
   * @param {string} str - The string to convert
   * @returns {string} snake_case string
   */
  toSnakeCase: function(str) {
    return str
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('_');
  },

  /**
   * Truncate a string to specified length
   * @param {string} str - The string to truncate
   * @param {number} length - Maximum length
   * @returns {string} Truncated string with ellipsis if needed
   */
  truncate: function(str, length) {
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
  }
};

/**
 * Array manipulation utilities
 */
const arrayUtils = {
  /**
   * Remove duplicates from an array
   * @param {Array} arr - The array to process
   * @returns {Array} Array with unique values
   */
  unique: function(arr) {
    return [...new Set(arr)];
  },

  /**
   * Chunk an array into smaller arrays of specified size
   * @param {Array} arr - The array to chunk
   * @param {number} size - Size of each chunk
   * @returns {Array} Array of chunks
   */
  chunk: function(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * Flatten a nested array
   * @param {Array} arr - The array to flatten
   * @returns {Array} Flattened array
   */
  flatten: function(arr) {
    return arr.reduce((flat, item) => 
      flat.concat(Array.isArray(item) ? this.flatten(item) : item), []
    );
  }
};

// Export all utilities
module.exports = {
  helpers,
  stringUtils,
  arrayUtils
};

// If running as main module, display welcome message
if (require.main === module) {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     Welcome to dev-codes.net           ║');
  console.log('║  Helpful Code Utilities for Developers ║');
  console.log('╔════════════════════════════════════════╗');
  console.log('\nAvailable modules:');
  console.log('  • helpers - Common helper functions');
  console.log('  • stringUtils - String manipulation utilities');
  console.log('  • arrayUtils - Array manipulation utilities');
  console.log('\nExample usage:');
  console.log('  const { helpers } = require(\'./index.js\');');
  console.log('  console.log(helpers.greet(\'Developer\'));');
  console.log('\nFor more information, visit the README.md file.');
}
