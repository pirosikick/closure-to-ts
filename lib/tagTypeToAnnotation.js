const j = require("jscodeshift");
const tagTypeToTSType = require("./tagTypeToTSType");

/**
 * @param {{ name: string }} type
 * @param {Array<string>=} nonNullableTypes - the names of non-nullable type
 */
module.exports = function tagTypeToAnnotation(type, nonNullableTypes) {
  const tsType = tagTypeToTSType(type, nonNullableTypes);
  return j.tsTypeAnnotation(tsType);
};
