module.exports = function nsToCamel(ns) {
  const [first, ...rest] = ns.split(".");
  const restString = rest
    .map(([f, ...r]) => `${f.toUpperCase()}${r.join("")}`)
    .join("");

  return `${first}${restString}`;
};
