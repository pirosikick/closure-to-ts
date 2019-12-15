const j = require("jscodeshift");

module.exports = function nsToNode(ns) {
  const names = ns.split(".");
  if (names.length === 1) {
    return j.identifier(ns);
  }

  return names.slice(2).reduce(
    (memberExpression, name) =>
      j.memberExpression(memberExpression, j.identifier(name)),

    j.memberExpression(j.identifier(names[0]), j.identifier(names[1]))
  );
};
