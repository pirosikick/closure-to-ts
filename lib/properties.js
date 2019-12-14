const api = require("jscodeshift");

module.exports = function properties(node) {
  return api.MemberExpression.check(node)
    ? [...properties(node.object), node.property]
    : [node];
};
