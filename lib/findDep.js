module.exports = function findDep(deps, ns) {
  return (
    Array.isArray(deps) && deps.find(dep => dep.closureSymbols.includes(ns))
  );
};
