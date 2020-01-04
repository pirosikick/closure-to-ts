// goog.provide("goog.string.internal");

import { SafeHtml } from "FIXME/goog.html.SafeHtml";

/**
 * Fast prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix A string to look for at the start of `str`.
 * @return {boolean} True if `str` begins with `prefix`.
 * @see goog.string.startsWith
 */
export const startsWith = function(str: string, prefix: string): boolean {
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
export const lastComponent = function(str: string, separators: string | Array<string>): string {};

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
export const buildString = function(...var_args: Array<any>): string {
  return Array.prototype.join.call(arguments, '');
};

/**
 * Repeats a string n times.
 * @param {string} string The string to repeat.
 * @param {number} length The number of times to repeat.
 * @return {string} A string containing `length` repetitions of
 *     `string`.
 */
export const repeat = (String.prototype.repeat) ? function(string: string, length: number): string {
  // The native method is over 100 times faster than the alternative.
  return string.repeat(length);
} : function(string: string, length: number): string {
  return new Array(length + 1).join(string);
};

/**
 * Takes a string of plain text and linkifies URLs and email addresses. For a
 * URL (unless opt_attributes is specified), the target of the link will be
 * _blank and it will have a rel=nofollow attribute applied to it so that links
 * created by linkify will not be of interest to search engines.
 * @param {string} text Plain text.
 * @param {!Object<string, ?goog.html.SafeHtml.AttributeValue>=} opt_attributes
 *     Attributes to add to all links created. Default are rel=nofollow and
 *     target=_blank. To clear those default attributes set rel='' and
 *     target=''.
 * @param {boolean=} opt_preserveNewlines Whether to preserve newlines with
 *     &lt;br&gt;.
 * @return {!goog.html.SafeHtml} Linkified HTML. Any text that is not part of a
 *      link will be HTML-escaped.
 */
export const linkifyPlainTextAsHtml = function(
 text: string,
 opt_attributes?: {
  [key: string]: SafeHtml.AttributeValue | null
 },
 opt_preserveNewlines?: boolean
): SafeHtml {};