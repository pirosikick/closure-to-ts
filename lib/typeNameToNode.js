const j = require("jscodeshift");

/**
 * convert a type name(ex: "a.b.SomeType") to an AST Node(identifier or tsQualifiedName)
 *
 * @param {string} name
 */
const typeNameToNode = name => {
  const ids = name.split(".").map(chunk => j.identifier(chunk));
  if (ids.length === 1) {
    return ids[0];
  }

  let returnVal = ids[0];
  for (let i = 1; i < ids.length; i++) {
    returnVal = j.tsQualifiedName(returnVal, ids[i]);
  }
  return returnVal;
};

module.exports = typeNameToNode;
