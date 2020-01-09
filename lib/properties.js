const j = require("jscodeshift");

module.exports = function properties(node) {
  if (j.MemberExpression.check(node)) {
    return [...properties(node.object), node.property];
  } else if (j.TSQualifiedName.check(node)) {
    return [...properties(node.left), node.right];
  }
  return [node];
};
