const j = require("jscodeshift");
const properties = require("./properties");

const propertyToString = property => {
  if (j.Identifier.check(property)) {
    return property.name;
  }
  return String(property.value) || "";
};

module.exports = function nodeToNamespace(node) {
  if (j.Identifier.check(node)) {
    return node.name;
  }

  if (j.MemberExpression.check(node) || j.TSQualifiedName.check(node)) {
    const props = properties(node);
    const names = props.map(prop => propertyToString(prop));
    return names.some(name => !name) ? "" : names.join(".");
  }

  return "";
};
