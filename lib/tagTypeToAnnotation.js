const j = require("jscodeshift");

module.exports = function tagTypeToAnnotation(type) {
  switch (type.name) {
    case "boolean":
      return j.tsTypeAnnotation(j.tsBooleanKeyword());
    case "string":
      return j.tsTypeAnnotation(j.tsStringKeyword());
    default:
      return j.tsTypeReference(j.identifier(type.name));
  }
};
