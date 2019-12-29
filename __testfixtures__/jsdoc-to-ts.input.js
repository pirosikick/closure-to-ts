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

/**
 * Finds the characters to the right of the last instance of any separator
 *
 * This function is similar to goog.string.path.baseName, except it can take a
 * list of characters to split the string on. It will return the rightmost
 * grouping of characters to the right of any separator as a left-to-right
 * oriented string.
 *
 * @see goog.string.path.baseName
 * @param {string} str The string
 * @param {string|!Array<string>} separators A list of separator characters
 * @return {string} The last part of the string with respect to the separators
 */
goog.string.internal.lastComponent = function(str, separators) {}

/**
 * Concatenates string expressions. This is useful
 * since some browsers are very inefficient when it comes to using plus to
 * concat strings. Be careful when using null and undefined here since
 * these will not be included in the result. If you need to represent these
 * be sure to cast the argument to a String first.
 * For example:
 * <pre>buildString('a', 'b', 'c', 'd') -> 'abcd'
 * buildString(null, undefined) -> ''
 * </pre>
 * @param {...*} var_args A list of strings to concatenate. If not a string,
 *     it will be casted to one.
 * @return {string} The concatenation of `var_args`.
 */
goog.string.internal.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, '');
};

/**
 * Repeats a string n times.
 * @param {string} string The string to repeat.
 * @param {number} length The number of times to repeat.
 * @return {string} A string containing `length` repetitions of
 *     `string`.
 */
goog.string.internal.repeat = (String.prototype.repeat) ? function(string, length) {
  // The native method is over 100 times faster than the alternative.
  return string.repeat(length);
} : function(string, length) {
  return new Array(length + 1).join(string);
};