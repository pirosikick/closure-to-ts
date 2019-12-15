const api = require("jscodeshift");
const properties = require("./properties");

const propertyToString = property => {
  if (api.Identifier.check(property)) {
    return property.name;
  }
  return String(property.value) || "";
};

module.exports = function nodeToNamespace(node) {
  if (api.Identifier.check(node)) {
    return node.name;
  }

  if (api.MemberExpression.check(node)) {
    const props = properties(node);
    const names = props.map(prop => propertyToString(prop));
    return names.some(name => !name) ? "" : names.join(".");
  }

  return "";
};
