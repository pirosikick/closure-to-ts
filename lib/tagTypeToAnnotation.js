const j = require("jscodeshift");
const tagTypeToTSType = require("./tagTypeToTSType");

/**
 * @param {{ name: string }} type
 * @param {Array.<string>} templates - @template values
 */
module.exports = function tagTypeToAnnotation(type, templates) {
  const tsType = tagTypeToTSType(type, templates);
  return j.tsTypeAnnotation(tsType);
};
