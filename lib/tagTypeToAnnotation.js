const j = require("jscodeshift");
const tagTypeToTSType = require("./tagTypeToTSType");

/**
 * @param {{ name: string }} type
 * @param {Array.<string>} templates - @template values
 * @param {Map.<string, string>} renameMap
 */
module.exports = function tagTypeToAnnotation(type, templates, renameMap) {
  const tsType = tagTypeToTSType(type, templates, renameMap);
  return j.tsTypeAnnotation(tsType);
};
