goog.provide('goog.string.internal');

/**
 * Fast prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix A string to look for at the start of `str`.
 * @return {boolean} True if `str` begins with `prefix`.
 * @see goog.string.startsWith
 */
goog.string.internal.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0;
};