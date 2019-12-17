const path = require("path");
const findDep = require("./findDep");

module.exports = function importPath(deps, fromNs, toNs, closurePath) {
  if (
    !fromNs ||
    !toNs ||
    !Array.isArray(deps) ||
    typeof closurePath !== "string"
  ) {
    return undefined;
  }

  const from = findDep(deps, fromNs);
  const to = findDep(deps, toNs);
  if (!from || !to) {
    return undefined;
  }

  from.setClosurePath(closurePath);
  to.setClosurePath(closurePath);
  let relativePath = path.relative(path.dirname(from.path), to.path);
  const ext = path.extname(relativePath);
  if (ext) {
    relativePath = relativePath.slice(0, ext.length * -1);
  }

  return relativePath[0] === "." ? relativePath : `./${relativePath}`;
};
