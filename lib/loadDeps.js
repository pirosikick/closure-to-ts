const fs = require("fs");
const { parser } = require("google-closure-deps");

module.exports = function loadDeps(depsPath) {
  let depsText;
  try {
    depsText = fs.readFileSync(depsPath).toString("utf8");
  } catch (e) {
    throw new Error(`failed to read deps.js: ${e.message}`);
  }

  return parser.parseDependencyFile(depsText, depsPath);
};
